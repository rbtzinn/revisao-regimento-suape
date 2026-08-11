type RemovedStructureNoticeProps = {
  previousName: string;
  currentName: string;
};

export function RemovedStructureNotice({
  previousName,
  currentName,
}: RemovedStructureNoticeProps) {
  return (
    <section className="border-l-4 border-rose-500 bg-rose-50 p-4 ring-1 ring-rose-200 sm:p-5">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-rose-600">
        Situação no organograma
      </p>
      <h3 className="mt-1 text-sm font-bold text-rose-950">
        Estrutura não localizada no organograma atual
      </h3>
      <p className="mt-4 text-sm leading-6 text-rose-900/80">
        <span className="font-semibold">{previousName}</span> consta no regimento
        de 2024, mas a planilha registra “{currentName}”. Por isso, este item é
        apenas informativo e não exige uma nova competência.
      </p>
    </section>
  );
}
