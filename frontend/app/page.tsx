import Link from "next/link";

import AppPreview from "@/components/AppPreview";

const FEATURES = [
  {
    title: "Grounded answers",
    body: "Every answer comes from your uploaded document — not from a chatbot's memory. No made-up facts.",
    icon: (
      <path d="M4 5a2 2 0 0 1 2-2h8l4 4v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z M9 12h6M12 9v6" />
    ),
  },
  {
    title: "Page-level citations",
    body: "Each claim carries a citation. Click it to jump to the exact page and see the highlighted source.",
    icon: <path d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />,
  },
  {
    title: "Never guesses",
    body: "If your documents don't contain the answer, MediCite says so — critical when the topic is your health.",
    icon: <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />,
  },
  {
    title: "Private to you",
    body: "Your documents stay in your own account. Each user's records are isolated and never shared.",
    icon: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
  },
];

const STEPS = [
  { n: "1", title: "Upload your report", body: "Drop in a discharge summary, lab report, or any PDF/DOCX." },
  { n: "2", title: "Ask in plain English", body: "“What medications was I discharged on?” — no medical jargon needed." },
  { n: "3", title: "Verify the source", body: "Read the answer, then click a citation to see the exact source page." },
];

const FAQS = [
  {
    q: "What is MediCite?",
    a: "MediCite is a tool that lets you ask questions about your medical reports in plain English and get answers grounded in the document, with clickable citations back to the source page.",
  },
  {
    q: "How is this different from a normal chatbot?",
    a: "A general chatbot answers from memory and can invent details. MediCite retrieves the actual relevant passages from your uploaded document first, then answers only from those — and cites where each fact came from.",
  },
  {
    q: "What documents can I check?",
    a: "Discharge summaries, lab and imaging reports, clinic notes, and medical research papers — any PDF or DOCX with a text layer.",
  },
  {
    q: "Is it medical advice?",
    a: "No. MediCite summarizes what your uploaded documents say. It is not a medical device and not a substitute for a qualified clinician — always verify against the cited source.",
  },
];

// FAQPage structured data — lets Google show these Q&As directly in results.
const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-clinical-600 to-clinical-400 text-white shadow-sm">
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 5a2 2 0 0 1 2-2h8l4 4v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
          <path d="M9 12h6M12 9v6" />
        </svg>
      </div>
      <span className="text-lg font-extrabold tracking-tight text-slate-900">MediCite</span>
    </div>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* Nav */}
      <header className="sticky top-0 z-20 border-b border-slate-200/60 bg-white/70 backdrop-blur-md">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <Logo />
          <div className="flex items-center gap-3">
            <Link href="/app" className="text-sm font-medium text-slate-600 transition hover:text-slate-900">
              Sign in
            </Link>
            <Link
              href="/app"
              className="rounded-lg bg-clinical-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-clinical-600"
            >
              Get started
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-16 text-center sm:pt-24">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-clinical-50 px-3 py-1 text-xs font-semibold text-clinical-700">
          <span className="h-1.5 w-1.5 rounded-full bg-clinical-500" />
          Grounded &amp; cited · never guesses
        </span>
        <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-extrabold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl">
          Understand your medical reports —{" "}
          <span className="bg-gradient-to-r from-clinical-600 to-clinical-400 bg-clip-text text-transparent">
            and trust the answer.
          </span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-slate-600">
          Upload a discharge summary, lab report, or any medical document and ask questions in plain
          English. MediCite answers from your document with clickable page-level citations — so you
          can verify every claim.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href="/app"
            className="rounded-xl bg-clinical-500 px-6 py-3 text-sm font-semibold text-white shadow-float transition hover:-translate-y-0.5 hover:bg-clinical-600"
          >
            Check a report free
          </Link>
          <a
            href="#how"
            className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-clinical-400"
          >
            How it works
          </a>
        </div>
        <p className="mt-4 text-xs text-slate-400">Free to try · your documents stay private</p>

        <div className="mt-14">
          <AppPreview />
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-clinical-50 text-clinical-600">
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                  {f.icon}
                </svg>
              </div>
              <h3 className="text-sm font-bold text-slate-900">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl px-6 py-16">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">How it works</h2>
          <p className="mx-auto mt-3 max-w-xl text-slate-600">
            Three steps from a dense medical document to an answer you can verify.
          </p>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-clinical-600 to-clinical-400 text-base font-bold text-white">
                {s.n}
              </div>
              <h3 className="mt-4 text-base font-bold text-slate-900">{s.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ — great for long-tail search queries */}
      <section className="mx-auto max-w-3xl px-6 py-16">
        <h2 className="text-center text-3xl font-extrabold tracking-tight text-slate-900">
          Frequently asked
        </h2>
        <div className="mt-8 space-y-3">
          {FAQS.map((f) => (
            <details key={f.q} className="group rounded-xl border border-slate-200 bg-white p-4 shadow-card">
              <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900 marker:hidden">
                <span className="flex items-center justify-between">
                  {f.q}
                  <span className="text-clinical-500 transition group-open:rotate-45">+</span>
                </span>
              </summary>
              <p className="mt-2.5 text-sm leading-relaxed text-slate-600">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-clinical-700 via-clinical-600 to-clinical-500 px-8 py-14 text-center text-white shadow-float">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-white/5" />
          <h2 className="relative text-3xl font-extrabold tracking-tight">Ask your first question in minutes</h2>
          <p className="relative mx-auto mt-3 max-w-xl text-clinical-50/90">
            Upload a report, ask anything, and see exactly where each answer comes from.
          </p>
          <Link
            href="/app"
            className="relative mt-7 inline-block rounded-xl bg-white px-6 py-3 text-sm font-bold text-clinical-700 shadow-sm transition hover:-translate-y-0.5"
          >
            Get started free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-sm text-slate-500 sm:flex-row">
          <Logo />
          <p className="max-w-md text-center text-xs leading-relaxed sm:text-right">
            Not a medical device. Summarizes uploaded documents only — not medical advice. Always
            verify against the cited source.
          </p>
        </div>
      </footer>
    </div>
  );
}
