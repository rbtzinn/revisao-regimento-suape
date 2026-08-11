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
        Fora do organograma atual
      </h3>
      <dl className="mt-4 grid gap-3 text-sm text-rose-950">
        <div>
          <dt className="text-[10px] font-bold uppercase tracking-[0.1em] text-rose-700">
            Regimento 2024
          </dt>
          <dd className="mt-0.5 font-semibold">{previousName}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-bold uppercase tracking-[0.1em] text-rose-700">
            Organograma atual
          </dt>
          <dd className="mt-0.5 font-semibold">{currentName}</dd>
        </div>
      </dl>
    </section>
  );
}
