const steps = [
  ["01", "Compare", "Nome antigo e nome atual"],
  ["02", "Revise", "Competência prevista em 2024"],
  ["03", "Salve", "Texto final do novo Regimento"],
] as const;

export function PortalIntro() {
  return (
    <section className="relative overflow-hidden rounded-[28px] border border-sky-100 bg-white px-5 py-6 shadow-[0_18px_60px_rgba(15,74,102,0.08)] sm:px-7 sm:py-8">
      <div aria-hidden="true" className="absolute -right-20 -top-24 size-64 rounded-full bg-cyan-200/45 blur-3xl" />
      <div aria-hidden="true" className="absolute right-8 top-0 h-1 w-28 rounded-b-full bg-amber-400" />

      <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(520px,0.9fr)] xl:items-end">
        <div className="max-w-3xl">
          <div className="font-utility inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-sky-800 sm:text-xs">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-amber-400" />
            Revisão orientada por setor
          </div>
          <h2 className="mt-4 text-2xl font-extrabold tracking-[-0.045em] text-slate-950 sm:text-4xl">
            Compare, revise e salve o texto final.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">
            Os dados de 2024 e do organograma atual já estão preenchidos. A
            diretoria revisa somente a competência que ficará no novo Regimento.
          </p>
        </div>

        <ol
          className="relative grid grid-cols-3 gap-2 rounded-2xl border border-sky-100 bg-sky-50/70 p-3 before:absolute before:left-[18%] before:right-[18%] before:top-[2rem] before:h-px before:bg-sky-200 sm:gap-4 sm:p-4"
          aria-label="Fluxo da revisão"
        >
          {steps.map(([number, title, description]) => (
            <li key={number} className="relative min-w-0 text-center">
              <span className="font-utility relative z-10 mx-auto grid size-8 place-items-center rounded-full border-4 border-sky-50 bg-[#0b6280] text-[9px] font-black tracking-[0.08em] text-white shadow-sm sm:size-9 sm:text-[10px]">
                {number}
              </span>
              <strong className="mt-2 block text-xs text-slate-900 sm:text-sm">{title}</strong>
              <span className="mt-1 hidden text-xs leading-5 text-slate-500 sm:block">
                {description}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
