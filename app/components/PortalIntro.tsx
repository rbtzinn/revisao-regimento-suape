export function PortalIntro() {
  return (
    <section className="relative hidden overflow-hidden rounded-[4px] border border-[#062D46]/25 border-l-[6px] border-l-[#21B6C7] bg-white px-3 py-3 sm:block sm:px-5 sm:py-4">
      <span
        aria-hidden="true"
        className="absolute right-0 top-0 h-2 w-12 bg-[#F5C400]"
      />

      <div className="grid gap-2 pr-10 lg:grid-cols-[minmax(260px,0.72fr)_minmax(0,1.28fr)] lg:items-center lg:gap-8">
        <h2 className="text-base font-extrabold leading-tight tracking-[-0.025em] text-[#062D46] sm:text-xl">
          Revise por diretoria
        </h2>
        <p className="hidden max-w-3xl text-sm leading-5 text-[#0B1F2A]/70 sm:block sm:leading-6">
          Compare o regimento de 2024 ao organograma atual e salve somente o
          texto que deverá constar na nova versão.
        </p>
      </div>
    </section>
  );
}
