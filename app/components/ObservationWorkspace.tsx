"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { useRouter } from "next/navigation";
import { ProductHeader } from "@/app/components/ProductHeader";
import {
  clearRecordsSnapshot,
  draftKey,
  useCompetencyRecords,
} from "@/app/hooks/useCompetencyRecords";
import { suggestObservation } from "@/app/lib/guide-suggestion";
import { getStructureStatus, saveStateMeta } from "@/app/lib/status";
import {
  DIRECTORATES,
  type CompetencyRecord,
  type DirectorateName,
} from "@/app/lib/types";

const SPREADSHEET_URL =
  "https://docs.google.com/spreadsheets/d/1SkfI6e-l68dvD43PC229rBtV3WEKT2Ikm6wDzo1iEpQ/edit";

const FIELD = "reviewedCompetence";
const FONT_SIZES = [15, 17, 19, 22];
const FONT_SIZE_KEY = "observacao-tamanho-texto";

type ObservationStatus = "done" | "draft" | "empty" | "error";

function searchable(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLocaleLowerCase("pt-BR");
}

function formatSyncTime(value?: string) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return `atualizada às ${date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  })}`;
}

function recordName(record: CompetencyRecord) {
  return record.currentName.trim() || record.previousName.trim() || "Estrutura sem nome";
}

/** Setor que vem no link (?id=), para abrir direto no setor certo. */
function idFromUrl() {
  if (typeof window === "undefined") return undefined;
  return new URLSearchParams(window.location.search).get("id") ?? undefined;
}

function readFontSize() {
  try {
    const value = Number(window.localStorage.getItem(FONT_SIZE_KEY));
    return FONT_SIZES.includes(value) ? value : FONT_SIZES[1];
  } catch {
    return FONT_SIZES[1];
  }
}

const statusDot: Record<ObservationStatus, string> = {
  done: "bg-emerald-500",
  draft: "bg-amber-500",
  empty: "bg-slate-300",
  error: "bg-red-600",
};

const statusLabel: Record<ObservationStatus, string> = {
  done: "Com observação",
  draft: "Alteração não salva",
  empty: "Sem observação",
  error: "Não foi possível salvar",
};

/** Caixa de texto que ocupa o espaço disponível e rola por dentro. */
function TextPanel({
  title,
  text,
  emptyMessage,
  accentClassName,
  fontSize,
}: {
  title: string;
  text: string;
  emptyMessage: string;
  accentClassName: string;
  fontSize: number;
}) {
  return (
    <section
      className={`flex min-h-0 flex-col border border-slate-300 border-t-4 bg-white ${accentClassName}`}
    >
      <h3 className="font-utility shrink-0 border-b border-slate-200 bg-[#f3f6f6] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#0b6b88]">
        {title}
      </h3>
      {text ? (
        <p
          className="min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap px-4 py-3 text-[#173b4d]"
          style={{ fontSize, lineHeight: 1.65 }}
        >
          {text}
        </p>
      ) : (
        <p className="px-4 py-3 text-sm italic text-slate-500">{emptyMessage}</p>
      )}
    </section>
  );
}

export function ObservationWorkspace() {
  const router = useRouter();
  const data = useCompetencyRecords();
  const textareaId = useId();
  const [directorate, setDirectorate] = useState<DirectorateName | "all">("all");
  const [query, setQuery] = useState("");
  const [onlyEmpty, setOnlyEmpty] = useState(false);
  const [selectedId, setSelectedId] = useState<string | undefined>(idFromUrl);
  const [fontSize, setFontSize] = useState(FONT_SIZES[1]);
  const [showFilters, setShowFilters] = useState(false);
  const [previousExpanded, setPreviousExpanded] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setFontSize(readFontSize()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  function changeFontSize(step: number) {
    const index = FONT_SIZES.indexOf(fontSize);
    const next = FONT_SIZES[Math.min(FONT_SIZES.length - 1, Math.max(0, index + step))];
    setFontSize(next);
    try {
      window.localStorage.setItem(FONT_SIZE_KEY, String(next));
    } catch {
      // Sem armazenamento, o tamanho só vale nesta visita.
    }
  }

  const draftOf = useCallback(
    (record: CompetencyRecord) =>
      data.drafts[draftKey(record.id, FIELD)] ?? record.reviewedCompetence ?? "",
    [data.drafts],
  );

  const statusOf = useCallback(
    (record: CompetencyRecord): ObservationStatus => {
      const state = data.saveStates[draftKey(record.id, FIELD)];
      if (state === "error" || state === "conflict") return "error";
      const saved = record.reviewedCompetence ?? "";
      if (draftOf(record) !== saved) return "draft";
      return saved.trim() ? "done" : "empty";
    },
    [draftOf, data.saveStates],
  );

  // Estruturas fora do organograma atual não recebem observação.
  const reviewable = useMemo(
    () => data.records.filter((record) => getStructureStatus(record) !== "removed"),
    [data.records],
  );

  const list = useMemo(() => {
    const terms = searchable(query.trim()).split(/\s+/).filter(Boolean);
    return reviewable.filter((record) => {
      if (directorate !== "all" && record.directorate !== directorate) return false;
      if (onlyEmpty && statusOf(record) === "done") return false;
      if (terms.length === 0) return true;
      const text = searchable(
        [
          record.currentName,
          record.previousName,
          record.newCompetence,
          record.previousCompetence,
          record.reviewedCompetence ?? "",
        ].join(" "),
      );
      return terms.every((term) => text.includes(term));
    });
  }, [reviewable, directorate, onlyEmpty, query, statusOf]);

  const selected =
    reviewable.find((record) => record.id === selectedId) ?? list[0];
  const position = selected ? list.findIndex((record) => record.id === selected.id) : -1;
  const supportsObservation = data.records.some(
    (record) => record.reviewedCompetence !== null,
  );

  const select = useCallback((id: string) => {
    setSelectedId(id);
    // Mantém o setor no link, para dar para compartilhar ou recarregar.
    window.history.replaceState(null, "", `/observacao?id=${encodeURIComponent(id)}`);
  }, []);

  function goRelative(step: number) {
    const next = list[position + step];
    if (next) select(next.id);
  }

  const doneCount = reviewable.filter((record) => statusOf(record) === "done").length;
  const hasUnsaved = reviewable.some((record) => draftOf(record) !== (record.reviewedCompetence ?? ""));

  // Avisa antes de fechar a aba com texto não salvo.
  useEffect(() => {
    if (!hasUnsaved) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [hasUnsaved]);

  const key = selected ? draftKey(selected.id, FIELD) : "";
  const draft = selected ? draftOf(selected) : "";
  const saved = selected?.reviewedCompetence ?? "";
  const isDirty = Boolean(selected) && draft !== saved;
  const saveState = data.saveStates[key] ?? "idle";
  const feedback = data.feedback[key];
  const isSaving = saveState === "saving";
  const canEdit = Boolean(selected) && supportsObservation && !data.isLoading;

  function save() {
    if (!selected || !isDirty || isSaving) return;
    void data.saveRecord(selected.id, FIELD);
  }

  // Não espera o Apps Script: a gravação segue em segundo plano e a bolinha
  // do setor na lista mostra se deu certo.
  const nextRecord = position >= 0 ? list[position + 1] : undefined;
  function saveAndNext() {
    save();
    if (nextRecord) select(nextRecord.id);
  }

  function onTextareaKeyDown(event: ReactKeyboardEvent<HTMLTextAreaElement>) {
    const modifier = event.ctrlKey || event.metaKey;
    if (modifier && event.key === "Enter") {
      event.preventDefault();
      saveAndNext();
    } else if (modifier && event.key === "s") {
      event.preventDefault();
      save();
    }
  }

  async function signOut() {
    clearRecordsSnapshot();
    try {
      await fetch("/api/auth", { method: "DELETE" });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  const statusText =
    feedback ??
    (isDirty ? saveStateMeta.idle.label : saved.trim() ? "Observação salva na planilha" : "");
  const statusClass = isDirty && !feedback ? saveStateMeta.idle.className : saveStateMeta[saveState].className;

  const isNewStructure = selected ? getStructureStatus(selected) === "new" : false;
  const previousText = selected && !isNewStructure ? selected.previousCompetence.trim() : "";

  return (
    <div className="flex h-dvh flex-col overflow-hidden text-[#0b1f2a]">
      <ProductHeader
        title="Observações da revisão"
        mobileTitle="Observações"
        lastSyncAt={formatSyncTime(data.lastSyncAt)}
        spreadsheetUrl={SPREADSHEET_URL}
        isSyncing={data.isSyncing}
        onSync={() => void data.refresh({ fresh: true })}
        onSignOut={() => void signOut()}
        navLinks={[
          { href: "/organograma", label: "Organograma", hideOnMobile: true },
          { href: "/", label: "Revisão" },
        ]}
      />

      {/* A tela inteira cabe na janela: nada rola fora das caixas de texto. */}
      <main className="mx-auto grid min-h-0 w-full max-w-[1700px] flex-1 grid-cols-[minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)] gap-2.5 px-2.5 py-2.5 sm:gap-3 sm:px-4 sm:py-3 lg:grid-cols-[280px_minmax(0,1fr)] lg:grid-rows-1 lg:gap-4 lg:px-6 lg:py-4">
        <aside className="flex min-h-0 flex-col border border-slate-300 bg-white">
          {/* No celular: só o seletor de setor, com filtros sob demanda. */}
          <div className="flex gap-2 p-2 lg:hidden">
            <select
              value={selected?.id ?? ""}
              onChange={(event) => select(event.target.value)}
              aria-label="Setor"
              className="min-h-11 min-w-0 flex-1 rounded-[3px] border border-[#0b6b88] bg-white px-2 text-sm font-bold text-[#0b1f2a] outline-none focus:ring-2 focus:ring-[#21b6c7]/30"
            >
              {list.length === 0 ? <option value="">Nenhum setor encontrado</option> : null}
              {DIRECTORATES.map((name) => {
                const items = list.filter((record) => record.directorate === name);
                if (items.length === 0) return null;
                return (
                  <optgroup key={name} label={name}>
                    {items.map((record) => (
                      <option key={record.id} value={record.id}>
                        {{ done: "✓ ", draft: "• ", error: "⚠ ", empty: "" }[statusOf(record)]}
                        {recordName(record)}
                      </option>
                    ))}
                  </optgroup>
                );
              })}
            </select>
            <button
              type="button"
              onClick={() => setShowFilters((value) => !value)}
              aria-expanded={showFilters}
              className={`min-h-11 shrink-0 border px-3 ${
                showFilters || directorate !== "all" || query || onlyEmpty
                  ? "border-[#062d46] bg-[#062d46] text-white"
                  : "border-slate-300 bg-white text-[#062d46]"
              }`}
            >
              <span className="text-xs font-bold">Filtros</span>
            </button>
          </div>

          <div
            className={`space-y-2 border-slate-200 p-3 pt-0 lg:block lg:border-b lg:pt-3 ${
              showFilters ? "block" : "hidden"
            }`}
          >
            <p className="font-utility flex justify-between gap-2 text-[11px] font-bold text-slate-500">
              <span className="uppercase tracking-[0.14em] text-[#0b6b88]">Setores</span>
              <span>
                {doneCount} de {reviewable.length} com observação
              </span>
            </p>
            <select
              value={directorate}
              onChange={(event) => setDirectorate(event.target.value as DirectorateName | "all")}
              aria-label="Diretoria"
              className="min-h-10 w-full rounded-[3px] border border-slate-300 bg-white px-2.5 text-sm font-semibold text-[#173b4d] outline-none focus:border-[#0b6b88] focus:ring-2 focus:ring-[#21b6c7]/20"
            >
              <option value="all">Todas as diretorias</option>
              {DIRECTORATES.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar setor ou texto"
              aria-label="Buscar setor ou texto"
              className="min-h-10 w-full rounded-[3px] border border-slate-300 bg-[#f7f9f9] px-2.5 text-[#0b1f2a] outline-none placeholder:text-slate-400 focus:border-[#0b6b88] focus:bg-white focus:ring-2 focus:ring-[#21b6c7]/20"
            />
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={onlyEmpty}
                onChange={(event) => setOnlyEmpty(event.target.checked)}
                className="size-4 accent-[#0b6b88]"
              />
              Só os que faltam observação
            </label>
          </div>

          <ul className="relative hidden min-h-0 flex-1 overflow-y-auto py-1 lg:block" aria-label="Lista de setores">
            {data.isLoading && list.length === 0 ? (
              <li className="px-3 py-3 text-sm text-slate-500">Carregando setores…</li>
            ) : null}
            {!data.isLoading && list.length === 0 ? (
              <li className="px-3 py-3 text-sm text-slate-500">Nenhum setor encontrado</li>
            ) : null}
            {list.map((record, index) => {
              const status = statusOf(record);
              const active = record.id === selected?.id;
              const showDirectorate =
                directorate === "all" && list[index - 1]?.directorate !== record.directorate;
              return (
                <li key={record.id}>
                  {showDirectorate ? (
                    <p className="font-utility px-3 pb-1 pt-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                      {record.directorate}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => select(record.id)}
                    aria-current={active ? "true" : undefined}
                    className={`flex w-full items-start gap-2.5 border-l-4 px-3 py-2 text-left transition ${
                      active
                        ? "border-[#f5c400] bg-[#062d46] text-white"
                        : "border-transparent text-[#173b4d] hover:bg-[#eef7f8]"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`mt-1.5 size-2.5 shrink-0 rounded-full ${statusDot[status]}`}
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold leading-snug">
                        {recordName(record)}
                      </span>
                      <span className="sr-only">{statusLabel[status]}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        <section className="flex min-h-0 flex-col gap-2.5 sm:gap-3" aria-labelledby="observacao-titulo">
          {!data.isLoading && data.loadError && data.records.length === 0 ? (
            <div className="shrink-0 border-l-4 border-red-600 bg-red-50 p-4 ring-1 ring-red-200">
              <p className="font-bold text-red-950">A planilha não respondeu</p>
              <p className="mt-1 text-sm text-red-800">{data.loadError}</p>
              <button
                type="button"
                onClick={() => void data.refresh({ fresh: true })}
                className="mt-3 min-h-11 rounded-[3px] bg-red-800 px-4 text-white hover:bg-red-700"
              >
                <span className="text-sm font-bold">Tentar novamente</span>
              </button>
            </div>
          ) : null}
          {!data.isLoading && data.loadError && data.records.length > 0 ? (
            <p className="shrink-0 border-l-4 border-amber-500 bg-amber-50 px-3 py-1.5 text-sm text-amber-950 ring-1 ring-amber-200">
              A planilha não respondeu agora. Mostrando a última leitura
              {formatSyncTime(data.lastSyncAt) ? ` (${formatSyncTime(data.lastSyncAt)})` : ""}.
            </p>
          ) : null}
          {data.records.length > 0 && !supportsObservation ? (
            <p className="shrink-0 border-l-4 border-amber-500 bg-amber-50 px-3 py-1.5 text-sm text-amber-950 ring-1 ring-amber-200">
              A planilha ainda não envia a coluna E (competência revisada e observações).
              Atualize o Apps Script para poder escrever aqui.
            </p>
          ) : null}
          {data.isLoading && !selected ? (
            <div className="min-h-0 flex-1 animate-pulse border border-slate-300 bg-white/80" />
          ) : null}

          {selected ? (
            <>
              <div className="flex shrink-0 items-center gap-2 border-l-4 border-[#f5c400] bg-white px-3 py-2 ring-1 ring-slate-200 sm:px-4">
                <div className="min-w-0 flex-1">
                  <p className="font-utility truncate text-[10px] font-bold uppercase tracking-[0.14em] text-[#0b6b88] sm:text-[11px]">
                    {selected.directorate}
                    {position >= 0 ? ` · ${position + 1} de ${list.length}` : ""}
                  </p>
                  <h2
                    id="observacao-titulo"
                    className="truncate text-lg font-black leading-tight tracking-[-0.015em] sm:text-2xl"
                    title={recordName(selected)}
                  >
                    {recordName(selected)}
                  </h2>
                </div>
                <div className="hidden items-center border border-slate-300 sm:flex" role="group" aria-label="Tamanho do texto">
                  <button
                    type="button"
                    onClick={() => changeFontSize(-1)}
                    disabled={fontSize === FONT_SIZES[0]}
                    aria-label="Diminuir texto"
                    title="Diminuir texto"
                    className="grid size-10 place-items-center text-[#062d46] hover:bg-[#eef7f8] disabled:opacity-35"
                  >
                    <span className="text-sm font-black">A−</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => changeFontSize(1)}
                    disabled={fontSize === FONT_SIZES[FONT_SIZES.length - 1]}
                    aria-label="Aumentar texto"
                    title="Aumentar texto"
                    className="grid size-10 place-items-center border-l border-slate-300 text-[#062d46] hover:bg-[#eef7f8] disabled:opacity-35"
                  >
                    <span className="text-lg font-black">A+</span>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => goRelative(-1)}
                  disabled={position <= 0}
                  aria-label="Setor anterior"
                  title="Setor anterior"
                  className="grid size-10 shrink-0 place-items-center border border-[#062d46] bg-white text-[#062d46] hover:bg-[#e9eff0] disabled:border-slate-300 disabled:text-slate-400"
                >
                  <span className="text-lg font-black leading-none">‹</span>
                </button>
                <button
                  type="button"
                  onClick={() => goRelative(1)}
                  disabled={position < 0 || position >= list.length - 1}
                  aria-label="Próximo setor"
                  title="Próximo setor"
                  className="grid size-10 shrink-0 place-items-center border border-[#062d46] bg-white text-[#062d46] hover:bg-[#e9eff0] disabled:border-slate-300 disabled:text-slate-400"
                >
                  <span className="text-lg font-black leading-none">›</span>
                </button>
              </div>

              {/* 2024 fica compacta: é só referência. */}
              <section className="shrink-0 border border-slate-300 border-l-4 border-l-slate-400 bg-[#f3f6f6]">
                <div className="flex items-center justify-between gap-2 px-3 pt-1.5">
                  <h3 className="font-utility text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                    Competência de 2024
                  </h3>
                  {previousText ? (
                    <button
                      type="button"
                      onClick={() => setPreviousExpanded((value) => !value)}
                      aria-expanded={previousExpanded}
                      className="min-h-8 px-1 text-[#0b6b88] hover:underline"
                    >
                      <span className="text-xs font-bold">{previousExpanded ? "Recolher" : "Ver tudo"}</span>
                    </button>
                  ) : null}
                </div>
                {previousText ? (
                  <div
                    className={`px-3 pb-2 text-slate-600 ${
                      previousExpanded ? "max-h-[28vh] overflow-y-auto" : ""
                    }`}
                    style={{ fontSize: Math.max(13, fontSize - 3), lineHeight: 1.5 }}
                  >
                    <p className={`whitespace-pre-wrap ${previousExpanded ? "" : "line-clamp-2"}`}>
                      {previousText}
                    </p>
                  </div>
                ) : (
                  <p className="px-3 pb-2 text-sm italic text-slate-500">
                    {isNewStructure
                      ? "Estrutura nova: não existia no regimento de 2024."
                      : "Sem texto no regimento de 2024."}
                  </p>
                )}
              </section>

              {/* Nova competência e observação lado a lado, do mesmo tamanho. */}
              <div className="grid min-h-0 flex-1 grid-rows-2 gap-2.5 sm:gap-3 lg:grid-cols-2 lg:grid-rows-1">
                <TextPanel
                  title="Nova competência"
                  text={selected.newCompetence.trim()}
                  emptyMessage="A nova competência ainda não foi escrita."
                  accentClassName="border-t-[#0b6b88]"
                  fontSize={fontSize}
                />

                <section className="flex min-h-0 flex-col border border-slate-300 border-t-4 border-t-[#f5c400] bg-white">
                  <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 bg-[#fffbe6] px-4 py-1.5">
                    <label
                      htmlFor={textareaId}
                      className="font-utility text-[11px] font-bold uppercase tracking-[0.14em] text-[#6b5600]"
                    >
                      Observação
                    </label>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={!canEdit || !selected.newCompetence.trim()}
                        onClick={() => {
                          data.updateDraft(selected.id, FIELD, selected.newCompetence);
                          data.markTextCopied(selected.id, FIELD, "Texto da nova competência copiado.");
                        }}
                        className="min-h-8 border border-[#6b5600]/40 bg-white px-2.5 text-[#6b5600] hover:bg-[#fff3b8] disabled:opacity-40"
                      >
                        <span className="text-xs font-bold">
                          <span className="sm:hidden">Copiar nova</span>
                          <span className="hidden sm:inline">Usar texto da nova competência</span>
                        </span>
                      </button>
                      <button
                        type="button"
                        disabled={!canEdit || !selected.newCompetence.trim()}
                        title="Lê a nova competência e sugere a observação com base nos dois guias de regimento interno"
                        onClick={() => {
                          const suggestion = suggestObservation(selected.newCompetence, selected.currentName);
                          if (!suggestion) {
                            data.markTextCopied(selected.id, FIELD, "O texto já segue os guias; nenhuma observação a sugerir.");
                            return;
                          }
                          if (draft.includes(suggestion)) {
                            data.markTextCopied(selected.id, FIELD, "A sugestão dos guias já está na observação.");
                            return;
                          }
                          // Não apaga o que já foi escrito: a sugestão entra no fim.
                          data.updateDraft(selected.id, FIELD, draft.trim() ? `${draft.trimEnd()}\n\n${suggestion}` : suggestion);
                          data.markTextCopied(selected.id, FIELD, "Sugestão dos guias inserida. Revise antes de salvar.");
                        }}
                        className="min-h-8 border border-[#6b5600]/40 bg-white px-2.5 text-[#6b5600] hover:bg-[#fff3b8] disabled:opacity-40"
                      >
                        <span className="text-xs font-bold">
                          <span className="sm:hidden">Sugestão</span>
                          <span className="hidden sm:inline">Sugestão de acordo com o guia</span>
                        </span>
                      </button>
                    </div>
                  </div>
                  <textarea
                    id={textareaId}
                    value={draft}
                    disabled={!canEdit}
                    onChange={(event) => data.updateDraft(selected.id, FIELD, event.target.value)}
                    onKeyDown={onTextareaKeyDown}
                    placeholder="Escreva a competência revisada ou as observações (ex.: atribuição repetida em outra função ou setor)"
                    className="block min-h-0 w-full flex-1 resize-none border-0 px-4 py-3 text-[#0b1f2a] outline-none placeholder:text-slate-400 focus:bg-[#fffef7] disabled:bg-slate-50"
                    style={{ fontSize, lineHeight: 1.65 }}
                  />
                  <div className="flex shrink-0 items-center gap-2 border-t border-slate-200 bg-[#f7f9f9] px-3 py-2 sm:gap-3 sm:px-4">
                    <p role="status" aria-live="polite" className={`min-w-0 flex-1 truncate text-xs sm:text-sm ${statusClass}`}>
                      {statusText}
                    </p>
                    {saveState === "conflict" ? (
                      <button
                        type="button"
                        onClick={() => void data.refresh({ fresh: true })}
                        className="min-h-10 border border-amber-600 bg-white px-3 text-amber-900 hover:bg-amber-50"
                      >
                        <span className="text-sm font-bold">Recarregar</span>
                      </button>
                    ) : null}
                    {nextRecord ? (
                      <button
                        type="button"
                        onClick={saveAndNext}
                        disabled={!canEdit || !isDirty || isSaving}
                        title="Salvar e ir para o próximo setor (Ctrl+Enter)"
                        className="min-h-10 shrink-0 border border-[#062d46] bg-white px-3 text-[#062d46] hover:bg-[#e9eff0] disabled:border-slate-300 disabled:text-slate-400"
                      >
                        <span className="text-sm font-bold">Salvar e próximo</span>
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={save}
                      disabled={!canEdit || !isDirty || isSaving}
                      title="Salvar (Ctrl+S)"
                      className="min-h-10 shrink-0 bg-[#062d46] px-4 text-white hover:bg-[#0b6b88] disabled:bg-slate-300 disabled:text-slate-500 sm:px-5"
                    >
                      <span className="text-sm font-black">{isSaving ? "Salvando…" : "Salvar"}</span>
                    </button>
                  </div>
                </section>
              </div>
            </>
          ) : null}
        </section>
      </main>
    </div>
  );
}
