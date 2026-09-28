"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useRouter } from "next/navigation";
import { ProductHeader } from "@/app/components/ProductHeader";
import { useCompetencyRecords } from "@/app/hooks/useCompetencyRecords";
import {
  ancestorsOf,
  buildOrgChart,
  normalizeText,
  searchOrgChart,
  type OrgChart,
  type OrgNode,
} from "@/app/lib/org-chart";
import {
  NODE_HEIGHT,
  NODE_WIDTH,
  boundsOf,
  edgePath,
  layoutOrgChart,
  type Bounds,
  type Point,
} from "@/app/lib/org-chart-layout";

const SPREADSHEET_URL =
  "https://docs.google.com/spreadsheets/d/1SkfI6e-l68dvD43PC229rBtV3WEKT2Ikm6wDzo1iEpQ/edit";

const MIN_SCALE = 0.05;
const MAX_SCALE = 2.2;
const FOCUS_MAX_SCALE = 1;
const DESKTOP_WIDTH = 1024;
const PANEL_WIDTH = 440;
const TOOLBAR_SPACE = 76;

type Camera = { x: number; y: number; k: number };
type Size = { width: number; height: number };

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function nodeLabel(node: OrgNode) {
  return node.acronym ? `${node.name} (${node.acronym})` : node.name;
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

/** Área livre do mapa, descontando a barra de busca e o painel aberto. */
function visibleArea(size: Size, panelOpen: boolean) {
  const desktop = size.width >= DESKTOP_WIDTH;
  const right = panelOpen && desktop ? PANEL_WIDTH : 0;
  const bottom = panelOpen && !desktop ? size.height * 0.55 : 0;
  return {
    left: 0,
    top: TOOLBAR_SPACE,
    width: Math.max(120, size.width - right),
    height: Math.max(120, size.height - TOOLBAR_SPACE - bottom),
  };
}

function cameraFor(bounds: Bounds, size: Size, panelOpen: boolean, maxScale: number): Camera {
  const area = visibleArea(size, panelOpen);
  const padding = 36;
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  const k = clamp(
    Math.min(
      (area.width - padding * 2) / Math.max(width, 1),
      (area.height - padding * 2) / Math.max(height, 1),
    ),
    MIN_SCALE,
    maxScale,
  );
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;
  return {
    k,
    x: area.left + area.width / 2 - centerX * k,
    y: area.top + area.height / 2 - centerY * k,
  };
}

/**
 * Enquadra a caixa e as filhas. Se forem muitas, mantém um zoom legível
 * centrado na caixa e deixa as filhas continuarem para cima e para baixo.
 */
function focusCamera(
  chart: OrgChart,
  positions: Map<string, Point>,
  id: string,
  size: Size,
): Camera | undefined {
  const node = chart.nodes.get(id);
  const point = positions.get(id);
  if (!node || !point) return undefined;
  const points = [id, ...node.childIds]
    .map((nodeId) => positions.get(nodeId))
    .filter((item): item is Point => Boolean(item));
  const bounds = boundsOf(points);
  const fitted = cameraFor(bounds, size, true, FOCUS_MAX_SCALE);
  const readable = size.width >= DESKTOP_WIDTH ? 0.8 : 0.62;
  if (fitted.k >= readable) return fitted;

  const area = visibleArea(size, true);
  const k = readable;
  return {
    k,
    x: area.left + area.width / 2 - ((bounds.minX + bounds.maxX) / 2) * k,
    y: area.top + area.height / 2 - point.y * k,
  };
}

/** Destaca os termos buscados sem depender de acentos ou maiúsculas. */
function Highlighted({ text, terms }: { text: string; terms: string[] }) {
  if (terms.length === 0 || !text) return <>{text}</>;

  const chars = Array.from(text);
  const normalizedChars = chars.map((char) => normalizeText(char) || char);
  if (normalizedChars.some((char) => char.length !== 1)) return <>{text}</>;

  const normalized = normalizedChars.join("");
  const marked = new Array<boolean>(chars.length).fill(false);
  for (const term of terms) {
    let index = normalized.indexOf(term);
    while (index !== -1) {
      for (let i = index; i < index + term.length; i += 1) marked[i] = true;
      index = normalized.indexOf(term, index + term.length);
    }
  }

  const parts: Array<{ text: string; mark: boolean }> = [];
  chars.forEach((char, index) => {
    const last = parts[parts.length - 1];
    if (last && last.mark === marked[index]) last.text += char;
    else parts.push({ text: char, mark: marked[index] });
  });

  return (
    <>
      {parts.map((part, index) =>
        part.mark ? (
          <mark key={index} className="rounded-[2px] bg-[#ffe45c] px-0.5 text-inherit">
            {part.text}
          </mark>
        ) : (
          <Fragment key={index}>{part.text}</Fragment>
        ),
      )}
    </>
  );
}

/** Trecho da competência em volta do termo, quando ele não está no nome. */
function competenceSnippet(node: OrgNode, terms: string[]) {
  const name = normalizeText(`${node.name} ${node.acronym ?? ""} ${node.record?.currentName ?? ""}`);
  if (terms.every((term) => name.includes(term))) return undefined;
  const record = node.record;
  if (!record) return undefined;
  const sources = [record.newCompetence, record.reviewedCompetence ?? "", record.previousCompetence];
  for (const source of sources) {
    const text = source.replace(/\s+/g, " ").trim();
    const chars = Array.from(text);
    const normalized = chars.map((char) => normalizeText(char) || char);
    if (normalized.some((char) => char.length !== 1)) continue;
    const index = terms
      .map((term) => normalized.join("").indexOf(term))
      .filter((position) => position >= 0)
      .sort((a, b) => a - b)[0];
    if (index === undefined) continue;
    const start = Math.max(0, index - 50);
    const end = Math.min(chars.length, index + 90);
    return `${start > 0 ? "…" : ""}${chars.slice(start, end).join("")}${end < chars.length ? "…" : ""}`;
  }
  return undefined;
}

function BackIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5" />
      <path d="M11 6l-6 6 6 6" />
    </svg>
  );
}

function OverviewIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="3" width="6" height="4" rx="1.5" />
      <rect x="2.5" y="17" width="6" height="4" rx="1.5" />
      <rect x="9" y="17" width="6" height="4" rx="1.5" />
      <rect x="15.5" y="17" width="6" height="4" rx="1.5" />
      <path d="M12 7v10M5.5 17v-3h13v3" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-4.2-4.2" />
    </svg>
  );
}

function CompetenceBlock({
  title,
  text,
  terms,
}: {
  title: string;
  text: string;
  terms: string[];
}) {
  return (
    <section className="border-t border-slate-200 pt-4">
      <h3 className="font-utility text-[11px] font-bold uppercase tracking-[0.14em] text-[#0b6b88]">
        {title}
      </h3>
      <p className="mt-2 whitespace-pre-wrap text-[14px] leading-6 text-[#173b4d]">
        <Highlighted text={text} terms={terms} />
      </p>
    </section>
  );
}

function UnitPanel({
  chart,
  node,
  terms,
  isLoading,
  onSelect,
  onClose,
}: {
  chart: OrgChart;
  node: OrgNode;
  terms: string[];
  isLoading: boolean;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const path = ancestorsOf(chart, node.id);
  const record = node.record;
  const newCompetence = record?.newCompetence.trim() ?? "";
  const reviewed = record?.reviewedCompetence?.trim() ?? "";
  const previous = record?.previousCompetence.trim() ?? "";
  const sheetName = record?.currentName.trim();
  const showSheetName =
    sheetName && normalizeText(sheetName) !== normalizeText(node.name);

  return (
    <aside
      aria-label={`Competências de ${node.name}`}
      className="absolute inset-x-0 bottom-0 z-30 flex h-[55%] flex-col border-t border-slate-300 bg-white shadow-[0_-18px_40px_-24px_rgba(6,45,70,0.55)] lg:inset-y-0 lg:left-auto lg:right-0 lg:h-auto lg:w-[440px] lg:border-l lg:border-t-0 lg:shadow-[-18px_0_40px_-24px_rgba(6,45,70,0.55)]"
    >
      <div className="flex items-start gap-3 border-b border-slate-200 bg-[#062d46] px-4 py-3 text-white sm:px-5">
        <div className="min-w-0 flex-1">
          {path.length > 0 ? (
            <nav aria-label="Caminho no organograma" className="flex flex-wrap items-center gap-x-1 gap-y-0.5 text-[11px] font-semibold text-cyan-100/85">
              {path.map((ancestor, index) => (
                <Fragment key={ancestor.id}>
                  {index > 0 ? <span aria-hidden="true">›</span> : null}
                  <button
                    type="button"
                    onClick={() => onSelect(ancestor.id)}
                    className="rounded-[2px] underline-offset-2 hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5c400]"
                  >
                    {ancestor.acronym ?? ancestor.name}
                  </button>
                </Fragment>
              ))}
            </nav>
          ) : null}
          <h2 className="mt-1 text-lg font-extrabold leading-snug tracking-[-0.01em]">
            <Highlighted text={nodeLabel(node)} terms={terms} />
          </h2>
          {showSheetName ? (
            <p className="mt-1 text-xs leading-5 text-cyan-100/90">
              Na planilha: <Highlighted text={sheetName} terms={terms} />
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar competências"
          title="Fechar"
          className="grid size-10 shrink-0 place-items-center rounded-full border border-white/25 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5c400]"
        >
          <span aria-hidden="true" className="text-xl leading-none">×</span>
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
        {isLoading && !record ? (
          <p role="status" className="text-sm text-slate-500">
            Carregando competências da planilha…
          </p>
        ) : !record ? (
          <p className="text-sm leading-6 text-slate-600">
            Esta estrutura não tem linha própria na planilha.
          </p>
        ) : (
          <>
            {newCompetence ? (
              <CompetenceBlock title="Competência no novo regimento" text={newCompetence} terms={terms} />
            ) : (
              <p className="text-sm leading-6 text-slate-600">
                A competência no novo regimento ainda não foi escrita.
              </p>
            )}
            {reviewed ? (
              <CompetenceBlock title="Competência revisada e observações" text={reviewed} terms={terms} />
            ) : null}
            {!newCompetence && previous && !normalizeText(previous).includes("nao localizado") ? (
              <CompetenceBlock title="Competência no regimento de 2024" text={previous} terms={terms} />
            ) : null}
          </>
        )}
      </div>
    </aside>
  );
}

export function OrgChartExplorer() {
  const router = useRouter();
  const data = useCompetencyRecords();
  const chart = useMemo(() => buildOrgChart(data.records), [data.records]);
  const layout = useMemo(() => layoutOrgChart(chart), [chart]);

  const viewportRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<Size>();
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, k: 0.2 });
  const [animating, setAnimating] = useState(false);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [history, setHistory] = useState<Array<string | null>>([]);
  const [query, setQuery] = useState("");
  const [resultsOpen, setResultsOpen] = useState(false);

  const cameraRef = useRef(camera);
  const sizeRef = useRef(size);
  const fittedRef = useRef(false);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const gestureRef = useRef<{ moved: boolean; distance?: number }>({ moved: false });
  const animationTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    cameraRef.current = camera;
  }, [camera]);

  useEffect(() => {
    sizeRef.current = size;
  }, [size]);

  const moveCamera = useCallback((next: Camera, animate: boolean) => {
    window.clearTimeout(animationTimer.current);
    setAnimating(animate);
    setCamera(next);
    if (animate) {
      animationTimer.current = window.setTimeout(() => setAnimating(false), 700);
    }
  }, []);

  const frameView = useCallback(
    (id: string | null, animate = true) => {
      const currentSize = sizeRef.current;
      if (!currentSize) return;
      if (id) {
        const next = focusCamera(chart, layout.positions, id, currentSize);
        if (next) moveCamera(next, animate);
      } else {
        moveCamera(cameraFor(layout.bounds, currentSize, false, FOCUS_MAX_SCALE), animate);
      }
    },
    [chart, layout, moveCamera],
  );

  // Mede o mapa e enquadra o organograma inteiro na primeira vez.
  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const next = {
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      };
      sizeRef.current = next;
      setSize(next);
      if (!fittedRef.current && next.width > 0 && next.height > 0) {
        fittedRef.current = true;
        moveCamera(cameraFor(layout.bounds, next, false, FOCUS_MAX_SCALE), false);
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [layout.bounds, moveCamera]);

  // As linhas extras da planilha mudam o desenho depois do carregamento.
  const untouched = history.length === 0 && !focusId;
  useEffect(() => {
    if (untouched && fittedRef.current) frameView(null, false);
    // Só reage à troca de desenho, não a cada navegação.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout]);

  const goTo = useCallback(
    (id: string | null) => {
      if (id === focusId) {
        frameView(id);
        return;
      }
      setHistory((current) => [...current, focusId]);
      setFocusId(id);
      frameView(id);
    },
    [focusId, frameView],
  );

  const goBack = useCallback(() => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory((current) => current.slice(0, -1));
    setFocusId(previous);
    frameView(previous);
  }, [history, frameView]);

  const closePanel = useCallback(() => {
    if (!focusId) return;
    setHistory((current) => [...current, focusId]);
    setFocusId(null);
  }, [focusId]);

  // Zoom com a roda do mouse, centrado no cursor.
  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;
      const current = cameraRef.current;
      const delta = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
      const k = clamp(current.k * Math.exp(-delta * 0.0016), MIN_SCALE, MAX_SCALE);
      const ratio = k / current.k;
      moveCamera(
        {
          k,
          x: mouseX - (mouseX - current.x) * ratio,
          y: mouseY - (mouseY - current.y) * ratio,
        },
        false,
      );
    };
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, [moveCamera]);

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointersRef.current.size === 1) gestureRef.current = { moved: false };
    if (pointersRef.current.size === 2) {
      const [a, b] = [...pointersRef.current.values()];
      gestureRef.current.distance = Math.hypot(a.x - b.x, a.y - b.y);
    }
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const pointers = pointersRef.current;
    const previous = pointers.get(event.pointerId);
    if (!previous) return;
    const next = { x: event.clientX, y: event.clientY };
    const gesture = gestureRef.current;
    const current = cameraRef.current;

    if (pointers.size >= 2) {
      pointers.set(event.pointerId, next);
      const [a, b] = [...pointers.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      const rect = viewportRef.current?.getBoundingClientRect();
      if (!rect || !gesture.distance) {
        gesture.distance = distance;
        return;
      }
      const centerX = (a.x + b.x) / 2 - rect.left;
      const centerY = (a.y + b.y) / 2 - rect.top;
      const k = clamp(current.k * (distance / gesture.distance), MIN_SCALE, MAX_SCALE);
      const ratio = k / current.k;
      gesture.distance = distance;
      gesture.moved = true;
      moveCamera(
        {
          k,
          x: centerX - (centerX - current.x) * ratio,
          y: centerY - (centerY - current.y) * ratio,
        },
        false,
      );
      return;
    }

    const dx = next.x - previous.x;
    const dy = next.y - previous.y;
    if (!gesture.moved && Math.hypot(dx, dy) < 4) return;
    if (!gesture.moved) {
      gesture.moved = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    pointers.set(event.pointerId, next);
    moveCamera({ ...current, x: current.x + dx, y: current.y + dy }, false);
  }

  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size < 2) gestureRef.current.distance = undefined;
  }

  // Busca interativa.
  const terms = useMemo(
    () => normalizeText(query).split(" ").filter(Boolean),
    [query],
  );
  const matches = useMemo(() => searchOrgChart(chart, query), [chart, query]);
  const matchSet = useMemo(() => new Set(matches), [matches]);
  const pathSet = useMemo(() => {
    const set = new Set<string>();
    for (const id of matches) {
      for (const ancestor of ancestorsOf(chart, id)) set.add(ancestor.id);
    }
    return set;
  }, [chart, matches]);
  const searching = terms.length > 0;

  // Enquadra os resultados enquanto a pessoa digita.
  useEffect(() => {
    if (!searching || matches.length === 0) return;
    const timer = window.setTimeout(() => {
      const currentSize = sizeRef.current;
      if (!currentSize) return;
      const points = matches
        .map((id) => layout.positions.get(id))
        .filter((point): point is Point => Boolean(point));
      moveCamera(
        cameraFor(boundsOf(points), currentSize, Boolean(focusId), FOCUS_MAX_SCALE),
        true,
      );
    }, 450);
    return () => window.clearTimeout(timer);
    // focusId fica de fora: abrir um resultado não deve refazer este enquadramento.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matches, searching, layout, moveCamera]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const target = event.target as HTMLElement | null;
      if (target?.tagName === "INPUT") return;
      goBack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goBack]);

  function onSearchKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && matches[0]) {
      event.preventDefault();
      setResultsOpen(false);
      goTo(matches[0]);
    }
    if (event.key === "Escape") {
      if (resultsOpen) setResultsOpen(false);
      else setQuery("");
    }
  }

  async function signOut() {
    try {
      await fetch("/api/auth", { method: "DELETE" });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  const focusNode = focusId ? chart.nodes.get(focusId) : undefined;
  const focusChildren = new Set(focusNode?.childIds ?? []);

  return (
    <div className="flex h-dvh flex-col overflow-hidden text-[#0b1f2a]">
      <ProductHeader
        title="Organograma"
        lastSyncAt={formatSyncTime(data.lastSyncAt)}
        spreadsheetUrl={SPREADSHEET_URL}
        isSyncing={data.isSyncing}
        onSync={() => void data.refresh({ fresh: true })}
        onSignOut={() => void signOut()}
        navLink={{ href: "/", label: "Revisão" }}
      />

      <main className="relative min-h-0 flex-1 overflow-hidden">
        <div className="absolute inset-x-3 top-3 z-20 flex items-start gap-2 sm:inset-x-4 lg:right-auto lg:w-[640px]">
          <button
            type="button"
            onClick={goBack}
            disabled={history.length === 0}
            aria-label="Voltar para a visualização anterior"
            title="Voltar"
            className="grid size-11 shrink-0 place-items-center rounded-full border border-slate-300 bg-white text-[#062d46] shadow-sm transition hover:border-[#0b6b88] hover:bg-[#eef7f8] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#21b6c7]"
          >
            <BackIcon />
          </button>
          <button
            type="button"
            onClick={() => goTo(null)}
            aria-label="Ver todo o organograma"
            title="Ver todo o organograma"
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-[#062d46] px-3 text-white shadow-sm transition hover:bg-[#0b4a6b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5c400] sm:px-4"
          >
            <OverviewIcon />
            <span className="hidden text-sm font-bold sm:inline">Organograma todo</span>
          </button>

          <div className="relative min-w-0 flex-1">
            <label htmlFor="org-search" className="sr-only">
              Buscar no organograma
            </label>
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
              <SearchIcon />
            </span>
            <input
              id="org-search"
              type="search"
              value={query}
              autoComplete="off"
              placeholder="Buscar setor, sigla ou tema"
              onChange={(event) => {
                setQuery(event.target.value);
                setResultsOpen(true);
              }}
              onFocus={() => setResultsOpen(true)}
              onBlur={() => window.setTimeout(() => setResultsOpen(false), 150)}
              onKeyDown={onSearchKeyDown}
              aria-controls="org-search-results"
              aria-expanded={resultsOpen && searching}
              role="combobox"
              className="h-11 w-full rounded-full border border-slate-300 bg-white pl-10 pr-20 text-sm text-[#0b1f2a] shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-[#0b6b88] focus:ring-2 focus:ring-[#21b6c7]/25"
            />
            {searching ? (
              <span
                aria-live="polite"
                className="font-utility pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[11px] font-bold text-[#0b6b88]"
              >
                {matches.length}
              </span>
            ) : null}

            {resultsOpen && searching ? (
              <ul
                id="org-search-results"
                role="listbox"
                className="absolute inset-x-0 top-[calc(100%+6px)] max-h-[min(55vh,420px)] overflow-y-auto rounded-2xl border border-slate-200 bg-white py-1.5 shadow-[0_18px_40px_-20px_rgba(6,45,70,0.55)]"
              >
                {matches.length === 0 ? (
                  <li className="px-4 py-3 text-sm text-slate-500">Nada encontrado</li>
                ) : (
                  matches.map((id) => {
                    const node = chart.nodes.get(id);
                    if (!node) return null;
                    const where = ancestorsOf(chart, id)
                      .filter((item) => item.highlight)
                      .map((item) => item.acronym ?? item.name)
                      .slice(-1)[0];
                    const snippet = competenceSnippet(node, terms);
                    return (
                      <li key={id} role="option" aria-selected={id === focusId}>
                        <button
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => {
                            setResultsOpen(false);
                            goTo(id);
                          }}
                          className="block w-full px-4 py-2 text-left hover:bg-[#eef7f8] focus-visible:bg-[#eef7f8] focus-visible:outline-none"
                        >
                          <span className="block text-[13px] font-bold leading-snug text-[#0b1f2a]">
                            <Highlighted text={nodeLabel(node)} terms={terms} />
                          </span>
                          {snippet ? (
                            <span className="mt-0.5 block text-xs leading-5 text-slate-600">
                              <Highlighted text={snippet} terms={terms} />
                            </span>
                          ) : null}
                          {where ? (
                            <span className="font-utility mt-0.5 block text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">
                              {where}
                            </span>
                          ) : null}
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
            ) : null}
          </div>
        </div>

        <div
          ref={viewportRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onScroll={(event) => {
            // O foco por teclado rolaria o contêiner; a câmera cuida do movimento.
            event.currentTarget.scrollTop = 0;
            event.currentTarget.scrollLeft = 0;
          }}
          className="absolute inset-0 cursor-grab touch-none select-none overflow-hidden active:cursor-grabbing"
        >
          <div
            className="absolute left-0 top-0 origin-top-left"
            style={{
              transform: `translate3d(${camera.x}px, ${camera.y}px, 0) scale(${camera.k})`,
              transition: animating
                ? "transform 650ms cubic-bezier(0.22, 0.8, 0.2, 1)"
                : undefined,
            }}
          >
            <svg
              aria-hidden="true"
              className="pointer-events-none absolute left-0 top-0 overflow-visible"
              width="1"
              height="1"
            >
              {chart.order.map((id) => {
                const node = chart.nodes.get(id);
                const parentPoint = node?.parentId
                  ? layout.positions.get(node.parentId)
                  : undefined;
                const point = layout.positions.get(id);
                if (!node?.parentId || !parentPoint || !point) return null;
                const dimmed = searching && !matchSet.has(id) && !pathSet.has(id);
                const active = node.parentId === focusId;
                return (
                  <path
                    key={id}
                    d={edgePath(parentPoint, point)}
                    fill="none"
                    stroke={active ? "#0b6b88" : "#1f2a33"}
                    strokeWidth={active ? 3 : 1.8}
                    vectorEffect="non-scaling-stroke"
                    opacity={dimmed ? 0.15 : 0.85}
                  />
                );
              })}
            </svg>

            {chart.order.map((id) => {
              const node = chart.nodes.get(id);
              const point = layout.positions.get(id);
              if (!node || !point) return null;
              const isFocus = id === focusId;
              const isMatch = matchSet.has(id);
              const dimmed = searching && !isMatch && !pathSet.has(id);
              const faded = searching && !isMatch && pathSet.has(id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={(event) => {
                    // Um arraste não abre a caixa; Enter/espaço (detail 0) sempre abre.
                    if (event.detail !== 0 && gestureRef.current.moved) return;
                    goTo(id);
                  }}
                  aria-label={nodeLabel(node)}
                  aria-pressed={isFocus}
                  title={nodeLabel(node)}
                  className={`absolute flex items-center justify-center rounded-full px-5 text-center uppercase transition-[box-shadow,opacity,transform] duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#21b6c7] ${
                    node.highlight
                      ? "bg-[#f8b323] text-[#2c56a0]"
                      : "bg-[#3560a9] text-white hover:bg-[#2b5196]"
                  } ${
                    isMatch
                      ? "shadow-[0_0_0_5px_#ffe45c,0_10px_28px_-10px_rgba(6,45,70,0.6)]"
                      : isFocus
                        ? "shadow-[0_0_0_5px_#062d46,0_10px_28px_-10px_rgba(6,45,70,0.6)]"
                        : focusChildren.has(id)
                          ? "shadow-[0_0_0_3px_#9fd9e0]"
                          : "shadow-[0_6px_16px_-10px_rgba(6,45,70,0.7)]"
                  } ${dimmed ? "opacity-20" : faded ? "opacity-60" : "opacity-100"}`}
                  style={{
                    left: point.x - NODE_WIDTH / 2,
                    top: point.y - NODE_HEIGHT / 2,
                    width: NODE_WIDTH,
                    height: NODE_HEIGHT,
                  }}
                >
                  <span
                    className={`line-clamp-4 py-0.5 leading-[1.25] [overflow-wrap:anywhere] ${
                      node.highlight
                        ? "text-[14px] font-black"
                        : "text-[12px] font-bold"
                    }`}
                  >
                    {nodeLabel(node)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {data.isLoading ? (
          <p
            role="status"
            className="pointer-events-none absolute bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-full bg-[#062d46] px-4 py-2 text-xs font-bold text-white shadow-lg"
          >
            Carregando competências da planilha…
          </p>
        ) : null}

        {!data.isLoading && data.loadError ? (
          <div
            role="alert"
            className="absolute bottom-4 left-1/2 z-20 flex w-[min(92vw,460px)] -translate-x-1/2 items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 shadow-lg"
          >
            <span className="min-w-0 flex-1">{data.loadError}</span>
            <button
              type="button"
              onClick={() => void data.refresh({ fresh: true })}
              className="shrink-0 rounded-full bg-red-800 px-3 py-1.5 text-white hover:bg-red-700"
            >
              <span className="text-xs font-bold">Tentar de novo</span>
            </button>
          </div>
        ) : null}

        {focusNode ? (
          <UnitPanel
            chart={chart}
            node={focusNode}
            terms={terms}
            isLoading={data.isLoading}
            onSelect={goTo}
            onClose={closePanel}
          />
        ) : null}
      </main>
    </div>
  );
}
