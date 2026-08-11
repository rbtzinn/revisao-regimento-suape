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
          className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-white/80"
        />
      ))}
      <span className="sr-only">Carregando os dados da planilha…</span>
    </div>
  );
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
      <h3 className="text-base font-bold text-red-950">A planilha não respondeu</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-red-800">
        {message}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 min-h-11 rounded-xl bg-red-800 px-5 text-sm font-bold text-white transition hover:bg-red-700"
      >
        Tentar novamente
      </button>
    </div>
  );
}

export function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-8 text-center">
      <p className="text-base font-bold text-slate-800">Nenhuma estrutura encontrada</p>
      <p className="mt-1 text-sm text-slate-500">
        Ajuste a diretoria, a busca ou o filtro selecionado.
      </p>
    </div>
  );
}
