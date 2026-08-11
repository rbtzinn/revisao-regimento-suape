type ErrorStateProps = {
  message: string;
  onRetry: () => void;
};

export function LoadingState() {
  return (
    <div aria-label="Carregando estruturas" role="status" className="space-y-3">
      {[0, 1, 2].map((item) => (
        <div
          key={item}
          className="h-24 animate-pulse border border-slate-300 bg-white/80"
        />
      ))}
      <span className="sr-only">Carregando os dados da planilha…</span>
    </div>
  );
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="border-l-4 border-red-600 bg-red-50 p-6 text-center ring-1 ring-red-200">
      <h3 className="text-base font-bold text-red-950">A planilha não respondeu</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-red-800">
        {message}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 min-h-11 rounded-[3px] bg-red-800 px-5 text-sm font-bold text-white transition hover:bg-red-700"
      >
        Tentar novamente
      </button>
    </div>
  );
}

export function EmptyState() {
  return (
    <div className="border border-dashed border-slate-400 bg-white/70 p-8 text-center">
      <p className="text-base font-bold text-slate-800">Nenhuma estrutura encontrada</p>
    </div>
  );
}
