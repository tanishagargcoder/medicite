"""Measure retrieval quality instead of asserting it.

Runs the real query path over a labelled question set and reports Recall@k and MRR
— once with the cross-encoder reranker and once without, so the effect of stage 2
is a number rather than a claim. With --answers it also grades the generated
answers for grounding and correct abstention.

    python scripts/evaluate.py              # retrieval only, no API key needed
    python scripts/evaluate.py --answers    # also grade answers (calls the LLM)

Relevance is labelled by section title because chunk ids are regenerated on every
ingest, while the section a passage belongs to is stable.
"""

from __future__ import annotations

import argparse
import atexit
import json
import os
import shutil
import sys
import tempfile
from pathlib import Path

BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND))

# Point storage at a throwaway directory *before* the app modules load, so an
# evaluation run can never touch a real index or upload folder.
_TMP = Path(tempfile.mkdtemp(prefix="medicite-eval-"))
os.environ["INDEX_DIR"] = str(_TMP / "index")
os.environ["UPLOAD_DIR"] = str(_TMP / "uploads")
os.environ["VECTOR_STORE"] = "local"
os.environ["USER_STORE"] = "local"
atexit.register(lambda: shutil.rmtree(_TMP, ignore_errors=True))

from app.chunking import chunk_blocks  # noqa: E402
from app.config import settings  # noqa: E402
from app.embeddings import embed_documents  # noqa: E402
from app.extraction import extract  # noqa: E402
from app.retrieval import retrieve  # noqa: E402
from app.store import DocumentRecord, store, utc_now_iso  # noqa: E402

EVAL_USER = "eval-user"


def ingest(pdf_path: Path) -> str:
    """Run the real ingestion pipeline and return the document id."""
    data = pdf_path.read_bytes()
    blocks, page_count = extract(pdf_path.name, data)
    document_id = "eval-doc"
    chunks = chunk_blocks(document_id, blocks)
    for chunk, vector in zip(chunks, embed_documents([c.text for c in chunks])):
        chunk.embedding = vector
    store.add_document(
        DocumentRecord(
            id=document_id,
            filename=pdf_path.name,
            page_count=page_count,
            chunk_count=len(chunks),
            uploaded_at=utc_now_iso(),
            user_id=EVAL_USER,
        ),
        chunks,
    )
    return document_id


def is_relevant(chunk, labels: list[dict]) -> bool:
    """A retrieved chunk counts as relevant if it is in a labelled section.

    Section is the primary key; page is checked too so a section repeated across
    pages can be labelled precisely.
    """
    for label in labels:
        section_ok = (chunk.section_title or "").strip().lower() == label["section"].strip().lower()
        page_ok = "page" not in label or chunk.page_number == label["page"]
        if section_ok and page_ok:
            return True
    return False


def score(chunks, labels: list[dict], ks: list[int]) -> tuple[dict[int, int], float]:
    """Recall@k hits and reciprocal rank for one question."""
    ranks = [i for i, c in enumerate(chunks, start=1) if is_relevant(c, labels)]
    hits = {k: int(any(r <= k for r in ranks)) for k in ks}
    rr = 1.0 / ranks[0] if ranks else 0.0
    return hits, rr


def evaluate_retrieval(questions: list[dict], ks: list[int], use_rerank: bool) -> dict:
    settings.rerank_enabled = use_rerank
    answerable = [q for q in questions if q["answerable"]]

    totals = {k: 0 for k in ks}
    rr_sum = 0.0
    per_question = []

    for q in answerable:
        # Ask for enough results to measure recall at the largest k.
        chunks, _ = retrieve(q["question"], EVAL_USER, None, max(ks))
        hits, rr = score(chunks, q["relevant"], ks)
        for k in ks:
            totals[k] += hits[k]
        rr_sum += rr
        per_question.append({"question": q["question"], "rr": rr, "hits": hits})

    n = len(answerable)
    return {
        "n": n,
        "recall": {k: totals[k] / n for k in ks},
        "mrr": rr_sum / n,
        "per_question": per_question,
    }


def evaluate_answers(questions: list[dict]) -> dict:
    """Grade the end-to-end answer: does it abstain when it should, and does it
    cite when it answers?"""
    from app.generation import generate_answer

    settings.rerank_enabled = True
    correct_abstain = wrong_abstain = grounded_cited = answered = 0
    failures = []

    for q in questions:
        chunks, _ = retrieve(q["question"], EVAL_USER, None, None)
        answer, markers, abstained, _ = generate_answer(q["question"], chunks)

        if q["answerable"]:
            answered += 1
            if abstained:
                wrong_abstain += 1
                failures.append(f"abstained on an answerable question: {q['question']}")
            elif markers:
                grounded_cited += 1
            else:
                failures.append(f"answered without citing: {q['question']}")
        else:
            if abstained:
                correct_abstain += 1
            else:
                failures.append(f"did NOT abstain on an unanswerable question: {q['question']}")

    unanswerable = sum(1 for q in questions if not q["answerable"])
    return {
        "answerable": answered,
        "unanswerable": unanswerable,
        "cited_rate": grounded_cited / answered if answered else 0.0,
        "false_abstentions": wrong_abstain,
        "correct_abstentions": correct_abstain,
        "abstention_accuracy": correct_abstain / unanswerable if unanswerable else 0.0,
        "failures": failures,
    }


def pct(x: float) -> str:
    return f"{x * 100:5.1f}%"


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate MediCite retrieval quality.")
    parser.add_argument("--answers", action="store_true", help="also grade generated answers (uses the LLM)")
    parser.add_argument("--k", default="1,3,5", help="comma-separated k values for Recall@k")
    args = parser.parse_args()
    ks = sorted(int(k) for k in args.k.split(","))

    spec = json.loads((BACKEND / "eval" / "questions.json").read_text(encoding="utf-8"))
    pdf = BACKEND / spec["document"]
    if not pdf.exists():
        sys.exit(f"Missing {pdf}. Run:  python scripts/make_sample.py")

    questions = spec["questions"]
    print(f"Corpus:    {pdf.name}")
    print(f"Questions: {len(questions)}  "
          f"({sum(q['answerable'] for q in questions)} answerable, "
          f"{sum(not q['answerable'] for q in questions)} unanswerable)\n")

    # Plain ASCII: Windows consoles default to cp1252 and mangle anything else.
    print("Ingesting...")
    ingest(pdf)
    print(f"  {store.get_document('eval-doc', EVAL_USER).chunk_count} chunks indexed\n")

    print("RETRIEVAL")
    print("-" * 58)
    header = "  stage".ljust(28) + "".join(f"R@{k}".rjust(8) for k in ks) + "MRR".rjust(9)
    print(header)

    results = {}
    for label, rerank in (("vector only (stage 1)", False), ("+ cross-encoder (stage 2)", True)):
        r = evaluate_retrieval(questions, ks, rerank)
        results[label] = r
        row = f"  {label}".ljust(28) + "".join(pct(r["recall"][k]).rjust(8) for k in ks)
        print(row + f"{r['mrr']:8.3f}")

    base = results["vector only (stage 1)"]
    tuned = results["+ cross-encoder (stage 2)"]
    delta = tuned["mrr"] - base["mrr"]
    print("-" * 58)
    print(f"  reranker effect on MRR: {delta:+.3f}"
          f"  ({'better' if delta > 0 else 'no gain' if delta == 0 else 'worse'})")

    misses = [p["question"] for p in tuned["per_question"] if p["rr"] == 0.0]
    if misses:
        print("\n  retrieval misses (relevant section never surfaced):")
        for m in misses:
            print(f"    - {m}")

    if args.answers:
        print("\nANSWER QUALITY")
        print("-" * 58)
        a = evaluate_answers(questions)
        print(f"  cited when answering:   {pct(a['cited_rate'])}  ({a['answerable']} questions)")
        print(f"  correct abstentions:    {pct(a['abstention_accuracy'])}  "
              f"({a['correct_abstentions']}/{a['unanswerable']} unanswerable)")
        print(f"  false abstentions:      {a['false_abstentions']}")
        if a["failures"]:
            print("\n  failures:")
            for f in a["failures"]:
                print(f"    - {f}")

    print()


if __name__ == "__main__":
    main()
