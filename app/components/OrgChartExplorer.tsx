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
import { getStructureStatus } from "@/app/lib/status";
import {
  ancestorsOf,
  buildOrgChart,
  normalizeText,
  searchOrgChart,
  type OrgChart,
  type OrgNode,
} from "@/app/lib/org-chart";
import { OVERVIEW_PAGE_ID } from "@/app/lib/org-chart-pages";
import {
  buildScene,
  locateNode,
  unionBounds,
  type Bounds,
  type Scene,
  type SceneBox,
} from "@/app/lib/org-chart-scene";

const SPREADSHEET_URL =
  "https://docs.google.com/spreadsheets/d/1SkfI6e-l68dvD43PC229rBtV3WEKT2Ikm6wDzo1iEpQ/edit";

const MIN_SCALE = 0.3;
const MAX_SCALE = 60;
const DESKTOP_WIDTH = 1024;
const PANEL_WIDTH = 440;
const TOOLBAR_SPACE = 76;
/** Pixels por ponto do PDF que deixam o texto das caixas legível. */
const READABLE_PX_PER_PT = 2.6;
const MAX_PX_PER_PT = 3.4;
const ZOOM_EASING = "cubic-bezier(0.65, 0, 0.25, 1)";
const ZOOM_MS = 900;

type Camera = { x: number; y: number; k: number };
type Size = { width: number; height: number };
type View = { groupId: string; focusId: string | null };

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

/** Área livre da tela, descontando a barra de busca e o painel aberto. */
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

function cameraFor(bounds: Bounds, size: Size, panelOpen: boolean, maxScale = MAX_SCALE): Camera {
  const area = visibleArea(size, panelOpen);
  const padding = 28;
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

/** Escala da página (pontos do PDF por unidade do mundo) onde a caixa está. */
function pageScale(scene: Scene, box: SceneBox) {
  const group = scene.groups.get(box.groupId);
  return group?.pages.find((page) => page.page.id === box.pageId)?.scale ?? 1;
}

/**
 * Enquadra a caixa escolhida e as filhas dela na mesma página. Se ficar
 * pequeno demais para ler, mantém um zoom legível com a caixa no alto.
 */
function focusCamera(scene: Scene, chart: OrgChart, view: View, size: Size) {
  if (!view.focusId) return undefined;
  const group = scene.groups.get(view.groupId);
  const box =
    group?.boxes.find((item) => item.nodeId === view.focusId) ??
    locateNode(scene, chart, view.focusId)?.box;
  if (!group || !box) return undefined;

  const childIds = new Set(chart.nodes.get(view.focusId)?.childIds ?? []);
  const related = group.boxes.filter(
    (item) => item.pageId === box.pageId && childIds.has(item.nodeId),
  );
  const bounds = unionBounds([box, ...related]);
  const scale = pageScale(scene, box);
  const fitted = cameraFor(bounds, size, true, MAX_PX_PER_PT / scale);
  const readable = (size.width >= DESKTOP_WIDTH ? READABLE_PX_PER_PT : 2) / scale;
  if (fitted.k >= readable) return fitted;

  const area = visibleArea(size, true);
  return {
    k: readable,
    x: area.left + area.width / 2 - (box.x + box.w / 2) * readable,
    y: area.top + 36 - box.y * readable,
  };
}

function viewCamera(scene: Scene, chart: OrgChart, view: View, size: Size) {
  const focused = focusCamera(scene, chart, view, size);
  if (focused) return focused;
  const group = scene.groups.get(view.groupId) ?? scene.groups.get(OVERVIEW_PAGE_ID);
  return group ? cameraFor(group.bounds, size, Boolean(view.focusId)) : undefined;
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
  emptyMessage,
  accentClassName,
  terms,
}: {
  title: string;
  text: string;
  emptyMessage: string;
  accentClassName: string;
  terms: string[];
}) {
  return (
    <section
      className={`flex flex-col rounded-[4px] border border-slate-200 border-t-4 bg-white ${accentClassName} ${
        text ? "lg:min-h-[7rem] lg:flex-1 lg:basis-0" : "lg:shrink-0"
      }`}
    >
      <h3 className="font-utility shrink-0 px-4 pb-1 pt-3 text-[11px] font-bold uppercase tracking-[0.14em] text-[#0b6b88]">
        {title}
      </h3>
      {text ? (
        <p className="min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap px-4 pb-4 text-[14px] leading-6 text-[#173b4d]">
          <Highlighted text={text} terms={terms} />
        </p>
      ) : (
        <p className="px-4 pb-4 text-sm italic leading-6 text-slate-500">{emptyMessage}</p>
      )}
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
  const isNewStructure = record ? getStructureStatus(record) === "new" : false;
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

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto bg-[#eef3f4] px-4 py-4 sm:px-5 lg:overflow-hidden">
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
            <CompetenceBlock
              title="Nova competência"
              text={newCompetence}
              emptyMessage="Ainda não foi escrita."
              accentClassName="border-t-[#0b6b88]"
              terms={terms}
            />
            <CompetenceBlock
              title="Competência de 2024"
              text={isNewStructure ? "" : previous}
              emptyMessage={
                isNewStructure
                  ? "Estrutura nova: não existia no regimento de 2024."
                  : "Sem texto no regimento de 2024."
              }
              accentClassName="border-t-slate-400"
              terms={terms}
            />
            {record.reviewedCompetence !== null ? (
              <CompetenceBlock
                title="Competência revisada e observações"
                text={reviewed}
                emptyMessage="Sem observações."
                accentClassName="border-t-[#f5c400]"
                terms={terms}
              />
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
  const scene = useMemo(() => buildScene(), []);

  const viewportRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<Size>();
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, k: 1 });
  const [animating, setAnimating] = useState(false);
  const [view, setView] = useState<View>({ groupId: OVERVIEW_PAGE_ID, focusId: null });
  const [history, setHistory] = useState<View[]>([]);
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
      animationTimer.current = window.setTimeout(() => setAnimating(false), ZOOM_MS + 50);
    }
  }, []);

  const frame = useCallback(
    (target: View, animate = true) => {
      const currentSize = sizeRef.current;
      if (!currentSize) return;
      const next = viewCamera(scene, chart, target, currentSize);
      if (next) moveCamera(next, animate);
    },
    [scene, chart, moveCamera],
  );

  // Mede a tela e enquadra a página geral na primeira vez.
  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const next = { width: entry.contentRect.width, height: entry.contentRect.height };
      sizeRef.current = next;
      setSize(next);
      if (!fittedRef.current && next.width > 0 && next.height > 0) {
        fittedRef.current = true;
        const overview = scene.groups.get(OVERVIEW_PAGE_ID);
        if (overview) moveCamera(cameraFor(overview.bounds, next, false), false);
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [scene, moveCamera]);

  const navigate = useCallback(
    (target: View) => {
      if (target.groupId !== view.groupId || target.focusId !== view.focusId) {
        setHistory((current) => [...current, view]);
        setView(target);
      }
      frame(target);
    },
    [view, frame],
  );

  const goBack = useCallback(() => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory((current) => current.slice(0, -1));
    setView(previous);
    frame(previous);
  }, [history, frame]);

  /** Abre as competências de um setor, indo até a página onde ele está. */
  const openNode = useCallback(
    (nodeId: string) => {
      const location = locateNode(scene, chart, nodeId);
      navigate({ groupId: location?.box.groupId ?? view.groupId, focusId: nodeId });
    },
    [scene, chart, navigate, view.groupId],
  );

  function onBoxClick(box: SceneBox) {
    if (box.groupId === OVERVIEW_PAGE_ID && scene.groupByRoot.has(box.nodeId)) {
      navigate({ groupId: box.nodeId, focusId: null });
      return;
    }
    navigate({ groupId: box.groupId, focusId: box.nodeId });
  }

  const closePanel = useCallback(() => {
    if (!view.focusId) return;
    setHistory((current) => [...current, view]);
    setView({ groupId: view.groupId, focusId: null });
  }, [view]);

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
        { k, x: mouseX - (mouseX - current.x) * ratio, y: mouseY - (mouseY - current.y) * ratio },
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
        { k, x: centerX - (centerX - current.x) * ratio, y: centerY - (centerY - current.y) * ratio },
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

  // Busca interativa: cada resultado aponta para a caixa onde aparece.
  const terms = useMemo(() => normalizeText(query).split(" ").filter(Boolean), [query]);
  const matches = useMemo(() => searchOrgChart(chart, query), [chart, query]);
  const searching = terms.length > 0;
  const matchLocations = useMemo(
    () =>
      matches
        .map((id) => locateNode(scene, chart, id)?.box)
        .filter((box): box is SceneBox => Boolean(box)),
    [scene, chart, matches],
  );
  const matchedBoxNodes = useMemo(
    () => new Set(matchLocations.map((box) => box.nodeId)),
    [matchLocations],
  );
  const matchesByGroup = useMemo(() => {
    const counts = new Map<string, number>();
    for (const box of matchLocations) {
      counts.set(box.groupId, (counts.get(box.groupId) ?? 0) + 1);
    }
    return counts;
  }, [matchLocations]);

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
      openNode(matches[0]);
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

  const focusNode = view.focusId ? chart.nodes.get(view.focusId) : undefined;
  const transition = animating ? `transform ${ZOOM_MS}ms ${ZOOM_EASING}` : undefined;

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

      <main className="relative min-h-0 flex-1 overflow-hidden bg-[#e7eced]">
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
            onClick={() => navigate({ groupId: OVERVIEW_PAGE_ID, focusId: null })}
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
                      <li key={id} role="option" aria-selected={id === view.focusId}>
                        <button
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => {
                            setResultsOpen(false);
                            openNode(id);
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
              transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.k})`,
              transition,
              ["--k" as string]: camera.k,
            }}
          >
            {[...scene.groups.values()].map((group) => {
              const active = group.id === view.groupId;
              return (
                <div
                  key={group.id}
                  aria-hidden={!active}
                  className={`absolute left-0 top-0 transition-opacity duration-700 ${
                    active ? "opacity-100" : "pointer-events-none opacity-0"
                  }`}
                  style={{ zIndex: group.id === OVERVIEW_PAGE_ID ? 0 : 1 }}
                >
                  {group.pages.map((item) => (
                    // eslint-disable-next-line @next/next/no-img-element -- SVG vetorial do PDF, precisa ficar nítido no zoom
                    <img
                      key={item.page.id}
                      src={item.page.src}
                      alt=""
                      draggable={false}
                      className="absolute max-w-none bg-white shadow-[0_18px_50px_-24px_rgba(6,45,70,0.55)]"
                      style={{
                        left: item.x,
                        top: item.y,
                        width: item.page.width * item.scale,
                        height: item.page.height * item.scale,
                      }}
                    />
                  ))}

                  {active
                    ? group.boxes.map((box) => {
                        const node = chart.nodes.get(box.nodeId);
                        if (!node) return null;
                        const isFocus = box.nodeId === view.focusId;
                        const isMatch = searching && matchedBoxNodes.has(box.nodeId);
                        const inside =
                          group.id === OVERVIEW_PAGE_ID ? matchesByGroup.get(box.nodeId) : undefined;
                        return (
                          <button
                            key={`${box.pageId}-${box.nodeId}`}
                            type="button"
                            onClick={(event) => {
                              // Um arraste não abre a caixa; Enter/espaço (detail 0) sempre abre.
                              if (event.detail !== 0 && gestureRef.current.moved) return;
                              onBoxClick(box);
                            }}
                            aria-label={nodeLabel(node)}
                            aria-pressed={isFocus}
                            title={nodeLabel(node)}
                            className={`org-hotspot absolute rounded-full focus-visible:outline-none ${
                              isFocus ? "is-focus" : ""
                            } ${isMatch || (searching && inside) ? "is-match" : ""}`}
                            style={{ left: box.x, top: box.y, width: box.w, height: box.h }}
                          >
                            {searching && inside ? (
                              <span className="org-badge font-utility" aria-hidden="true">
                                {inside}
                              </span>
                            ) : null}
                          </button>
                        );
                      })
                    : null}
                </div>
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
            onSelect={openNode}
            onClose={closePanel}
          />
        ) : null}
      </main>
    </div>
  );
}
