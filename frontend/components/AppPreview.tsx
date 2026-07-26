/** A stylized mock of the product for the landing hero.
 *
 *  Built in markup rather than a screenshot so it stays sharp at any size, needs
 *  no image asset, and re-themes with the accent color.
 */
export default function AppPreview() {
  return (
    <div className="relative mx-auto max-w-4xl">
      {/* glow */}
      <div className="pointer-events-none absolute inset-x-8 -top-4 h-40 rounded-full bg-clinical-400/20 blur-3xl" />

      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-float">
        {/* window chrome */}
        <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <span className="ml-3 truncate rounded-md bg-white px-2.5 py-1 text-[11px] text-slate-400 ring-1 ring-slate-200">
            medicite.app / workspace
          </span>
        </div>

        <div className="grid grid-cols-12 text-left">
          {/* sidebar */}
          <div className="col-span-3 hidden border-r border-slate-200 p-3 sm:block">
            <div className="mb-3 flex items-center gap-2">
              <div className="h-6 w-6 rounded-md bg-gradient-to-br from-clinical-600 to-clinical-400" />
              <div className="h-2.5 w-16 rounded bg-slate-200" />
            </div>
            <div className="rounded-lg border-2 border-dashed border-slate-200 py-4 text-center">
              <div className="mx-auto mb-1.5 h-6 w-6 rounded-full bg-clinical-100" />
              <div className="mx-auto h-2 w-14 rounded bg-slate-200" />
            </div>
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2 rounded-md bg-clinical-50 p-2">
                <div className="h-5 w-5 shrink-0 rounded bg-clinical-500" />
                <div className="min-w-0 flex-1">
                  <div className="h-2 w-full rounded bg-slate-300" />
                  <div className="mt-1 h-1.5 w-2/3 rounded bg-slate-200" />
                </div>
              </div>
              <div className="flex items-center gap-2 p-2">
                <div className="h-5 w-5 shrink-0 rounded bg-slate-200" />
                <div className="min-w-0 flex-1">
                  <div className="h-2 w-4/5 rounded bg-slate-200" />
                  <div className="mt-1 h-1.5 w-1/2 rounded bg-slate-100" />
                </div>
              </div>
            </div>
          </div>

          {/* chat */}
          <div className="col-span-12 space-y-3 p-4 sm:col-span-9 lg:col-span-5">
            <div className="flex justify-end">
              <p className="max-w-[85%] rounded-2xl rounded-br-md bg-gradient-to-br from-clinical-600 to-clinical-500 px-3 py-2 text-xs font-medium text-white">
                What medications was the patient discharged on?
              </p>
            </div>

            <div className="rounded-2xl rounded-tl-md border border-slate-200 bg-white p-3 shadow-sm">
              <p className="text-xs leading-relaxed text-slate-700">
                The patient was discharged on Furosemide 40 mg once daily, Carvedilol 6.25 mg twice
                daily, and Lisinopril 10 mg once daily
                <span className="mx-0.5 inline-flex items-center rounded bg-clinical-100 px-1 py-0.5 text-[10px] font-bold text-clinical-700">
                  1
                </span>
                . Empagliflozin 10 mg was newly started this admission
                <span className="mx-0.5 inline-flex items-center rounded bg-clinical-100 px-1 py-0.5 text-[10px] font-bold text-clinical-700">
                  2
                </span>
                .
              </p>

              <div className="mt-2.5 border-t border-slate-100 pt-2">
                <p className="mb-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  Sources
                </p>
                <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-2">
                  <div className="flex items-center gap-1.5">
                    <span className="flex h-4 w-4 items-center justify-center rounded bg-clinical-500 text-[9px] font-bold text-white">
                      1
                    </span>
                    <span className="truncate text-[10px] font-semibold text-slate-700">
                      discharge_summary.pdf
                    </span>
                    <span className="ml-auto shrink-0 text-[10px] font-medium text-clinical-600">
                      p.3 · Discharge Medications
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* pdf viewer with highlight */}
          <div className="col-span-12 hidden border-l border-slate-200 bg-slate-100/60 p-3 lg:col-span-4 lg:block">
            <div className="mb-2 flex items-center justify-between">
              <div className="h-2 w-24 rounded bg-slate-300" />
              <div className="h-2 w-8 rounded bg-slate-200" />
            </div>
            <div className="rounded bg-white p-3 shadow-sm ring-1 ring-slate-200">
              <div className="mb-2 h-1.5 w-1/3 rounded bg-slate-300" />
              <div className="space-y-1.5">
                <div className="h-1.5 w-full rounded bg-slate-100" />
                <div className="h-1.5 w-5/6 rounded bg-slate-100" />
              </div>
              {/* the highlighted, cited lines */}
              <div className="mt-2.5 space-y-1.5 rounded bg-amber-200/60 p-1.5 ring-1 ring-amber-300">
                <div className="h-1.5 w-full rounded bg-amber-500/40" />
                <div className="h-1.5 w-4/5 rounded bg-amber-500/40" />
                <div className="h-1.5 w-11/12 rounded bg-amber-500/40" />
              </div>
              <div className="mt-2.5 space-y-1.5">
                <div className="h-1.5 w-full rounded bg-slate-100" />
                <div className="h-1.5 w-2/3 rounded bg-slate-100" />
              </div>
            </div>
            <p className="mt-2 text-center text-[9px] font-medium text-clinical-600">
              ↑ cited text, highlighted
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
