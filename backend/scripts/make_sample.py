"""Generate a synthetic discharge summary PDF for demos and testing.

Entirely fabricated — no real patient data. Run:  python scripts/make_sample.py
"""

from pathlib import Path

import fitz

PAGES = [
    (
        "DISCHARGE SUMMARY\n\n"
        "PATIENT: Doe, Jane (SYNTHETIC RECORD — NOT A REAL PATIENT)\n"
        "MRN: 000-DEMO-001\n"
        "ADMISSION DATE: 2026-03-04\n"
        "DISCHARGE DATE: 2026-03-09\n"
        "ATTENDING: R. Mehta, MD\n\n"
        "CHIEF COMPLAINT\n"
        "Shortness of breath and bilateral ankle swelling for six days.\n\n"
        "HISTORY OF PRESENT ILLNESS\n"
        "A 64-year-old woman with a history of hypertension and type 2 diabetes mellitus\n"
        "presented to the emergency department with progressive exertional dyspnea over\n"
        "six days, now occurring at rest. She reported two-pillow orthopnea and a 4 kg\n"
        "weight gain over the same period. She denied chest pain, fever, or cough. She\n"
        "reported adherence to her home medications with the exception of intermittent\n"
        "missed doses of furosemide over the preceding two weeks.\n\n"
        "PAST MEDICAL HISTORY\n"
        "Hypertension, diagnosed 2011.\n"
        "Type 2 diabetes mellitus, diagnosed 2016, without documented retinopathy.\n"
        "Chronic kidney disease stage 2.\n"
        "No prior myocardial infarction.\n\n"
        "ALLERGIES\n"
        "Penicillin — documented rash. No other known drug allergies."
    ),
    (
        "PHYSICAL EXAMINATION\n\n"
        "VITAL SIGNS\n"
        "Temperature 36.9 C. Heart rate 98 beats per minute. Blood pressure 158/94 mmHg.\n"
        "Respiratory rate 22 breaths per minute. Oxygen saturation 91 percent on room air,\n"
        "improving to 96 percent on 2 L nasal cannula.\n\n"
        "General: alert, mildly dyspneic while speaking in full sentences.\n"
        "Cardiovascular: elevated jugular venous pressure at approximately 10 cm. Regular\n"
        "rhythm with an audible S3 gallop. No murmur appreciated.\n"
        "Respiratory: bibasilar crackles to the mid lung fields bilaterally.\n"
        "Extremities: pitting edema to the mid shin bilaterally, graded 2+.\n\n"
        "LABORATORY RESULTS\n"
        "B-type natriuretic peptide 1,240 pg/mL (reference range less than 100 pg/mL).\n"
        "Serum creatinine 1.4 mg/dL on admission, 1.2 mg/dL at discharge.\n"
        "Estimated glomerular filtration rate 48 mL/min/1.73m2 on admission.\n"
        "Serum potassium 3.6 mmol/L on admission, 4.1 mmol/L at discharge.\n"
        "Serum sodium 136 mmol/L. Hemoglobin A1c 8.2 percent.\n"
        "Troponin T less than 0.01 ng/mL on two serial measurements.\n\n"
        "IMAGING\n"
        "Chest radiograph on admission demonstrated pulmonary vascular congestion with\n"
        "small bilateral pleural effusions and cardiomegaly.\n"
        "Transthoracic echocardiogram demonstrated a left ventricular ejection fraction of\n"
        "35 percent with global hypokinesis. No significant valvular disease was reported."
    ),
    (
        "ASSESSMENT AND PLAN\n\n"
        "Acute decompensated heart failure with newly reduced ejection fraction (35 percent).\n"
        "The presentation was attributed to volume overload in the setting of missed diuretic\n"
        "doses and uncontrolled hypertension. Ischemic evaluation was negative, with serial\n"
        "troponin measurements below the assay threshold.\n\n"
        "The patient was diuresed with intravenous furosemide with a net negative fluid\n"
        "balance of 5.2 litres over the admission. Symptoms improved and oxygen saturation\n"
        "normalized on room air by hospital day four. Guideline-directed medical therapy was\n"
        "initiated and titrated as tolerated.\n\n"
        "HOSPITAL COURSE\n"
        "Day 1 to 2: intravenous diuresis, continuous telemetry, daily weights.\n"
        "Day 3: echocardiogram obtained; carvedilol and lisinopril initiated.\n"
        "Day 4: transitioned to oral diuretic therapy; oxygen weaned to room air.\n"
        "Day 5: ambulated without desaturation; discharged in stable condition.\n\n"
        "DISCHARGE MEDICATIONS\n"
        "Furosemide 40 mg orally once daily.\n"
        "Carvedilol 6.25 mg orally twice daily.\n"
        "Lisinopril 10 mg orally once daily.\n"
        "Metformin 1000 mg orally twice daily.\n"
        "Atorvastatin 40 mg orally once daily at bedtime.\n"
        "Empagliflozin 10 mg orally once daily, newly started this admission.\n\n"
        "FOLLOW-UP\n"
        "Cardiology clinic in 7 to 10 days with a repeat basic metabolic panel.\n"
        "Primary care in 2 weeks for diabetes management given the A1c of 8.2 percent.\n"
        "Daily weight monitoring; the patient was instructed to report a gain exceeding\n"
        "2 kg over three days.\n"
        "Sodium restriction of less than 2 grams per day was discussed."
    ),
]


def main() -> None:
    doc = fitz.open()
    for text in PAGES:
        page = doc.new_page()
        page.insert_textbox(
            fitz.Rect(56, 56, 556, 780),
            text,
            fontname="helv",
            fontsize=10.5,
            align=0,
        )
    out = Path(__file__).resolve().parent.parent / "data" / "sample_discharge_summary.pdf"
    out.parent.mkdir(parents=True, exist_ok=True)
    doc.save(out)
    doc.close()
    print(f"Wrote {out}")


if __name__ == "__main__":
    main()
