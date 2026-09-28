import { ancestorsOf, type OrgChart } from "@/app/lib/org-chart";
import { OVERVIEW_PAGE_ID, PDF_PAGES, type PdfPage } from "@/app/lib/org-chart-pages";

export type Bounds = { minX: number; minY: number; maxX: number; maxY: number };

/** Caixa já no espaço do mundo (a página geral fica em pontos do PDF). */
export type SceneBox = {
  groupId: string;
  pageId: string;
  nodeId: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type ScenePage = {
  page: PdfPage;
  groupId: string;
  x: number;
  y: number;
  scale: number;
};

/**
 * Um grupo é o que aparece junto na tela: a página geral, ou as páginas de
 * uma diretoria (a Presidência ocupa duas páginas lado a lado).
 */
export type SceneGroup = {
  id: string;
  rootId?: string;
  pages: ScenePage[];
  boxes: SceneBox[];
  bounds: Bounds;
};

export type Scene = {
  groups: Map<string, SceneGroup>;
  /** Grupo aberto ao clicar a caixa deste setor na página geral. */
  groupByRoot: Map<string, string>;
};

/** Espaço entre as páginas de um mesmo grupo, em pontos do PDF. */
const PAGE_GAP = 24;

export function unionBounds(items: Array<{ x: number; y: number; w: number; h: number }>): Bounds {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const item of items) {
    minX = Math.min(minX, item.x);
    minY = Math.min(minY, item.y);
    maxX = Math.max(maxX, item.x + item.w);
    maxY = Math.max(maxY, item.y + item.h);
  }
  if (!Number.isFinite(minX)) return { minX: 0, minY: 0, maxX: 1, maxY: 1 };
  return { minX, minY, maxX, maxY };
}

function placeBoxes(page: ScenePage): SceneBox[] {
  return page.page.boxes.map((box) => ({
    groupId: page.groupId,
    pageId: page.page.id,
    nodeId: box.nodeId,
    x: page.x + box.x * page.scale,
    y: page.y + box.y * page.scale,
    w: box.w * page.scale,
    h: box.h * page.scale,
  }));
}

/**
 * Cada página de diretoria fica encaixada dentro da caixa dela na página
 * geral: a caixa de título da página coincide com a caixa clicada. Assim,
 * o zoom na caixa leva direto para a página, como um mergulho.
 */
export function buildScene(): Scene {
  const overview = PDF_PAGES.find((page) => page.id === OVERVIEW_PAGE_ID);
  if (!overview) throw new Error("Página geral do organograma ausente.");

  const groups = new Map<string, SceneGroup>();
  const groupByRoot = new Map<string, string>();

  const overviewPage: ScenePage = { page: overview, groupId: OVERVIEW_PAGE_ID, x: 0, y: 0, scale: 1 };
  groups.set(OVERVIEW_PAGE_ID, {
    id: OVERVIEW_PAGE_ID,
    pages: [overviewPage],
    boxes: placeBoxes(overviewPage),
    bounds: { minX: 0, minY: 0, maxX: overview.width, maxY: overview.height },
  });

  const byRoot = new Map<string, PdfPage[]>();
  for (const page of PDF_PAGES) {
    if (!page.rootId) continue;
    byRoot.set(page.rootId, [...(byRoot.get(page.rootId) ?? []), page]);
  }

  for (const [rootId, pages] of byRoot) {
    const anchor = overview.boxes.find((box) => box.nodeId === rootId);
    const title = pages[0].boxes.find((box) => box.nodeId === rootId);
    if (!anchor || !title) continue;

    const scale = Math.min(anchor.w / title.w, anchor.h / title.h);
    const originX = anchor.x + anchor.w / 2 - (title.x + title.w / 2) * scale;
    const originY = anchor.y + anchor.h / 2 - (title.y + title.h / 2) * scale;

    const scenePages: ScenePage[] = [];
    let cursor = originX;
    for (const page of pages) {
      scenePages.push({ page, groupId: rootId, x: cursor, y: originY, scale });
      cursor += (page.width + PAGE_GAP) * scale;
    }

    groups.set(rootId, {
      id: rootId,
      rootId,
      pages: scenePages,
      boxes: scenePages.flatMap(placeBoxes),
      bounds: unionBounds(
        scenePages.map((item) => ({
          x: item.x,
          y: item.y,
          w: item.page.width * item.scale,
          h: item.page.height * item.scale,
        })),
      ),
    });
    groupByRoot.set(rootId, rootId);
  }

  return { groups, groupByRoot };
}

/**
 * Onde um setor aparece: de preferência na página da própria diretoria.
 * Linhas da planilha que não estão no PDF usam a caixa do setor acima.
 */
export function locateNode(scene: Scene, chart: OrgChart, nodeId: string) {
  const find = (id: string) => {
    let overviewBox: SceneBox | undefined;
    for (const group of scene.groups.values()) {
      const box = group.boxes.find((item) => item.nodeId === id);
      if (!box) continue;
      if (group.id !== OVERVIEW_PAGE_ID) return box;
      overviewBox = box;
    }
    return overviewBox;
  };

  const direct = find(nodeId);
  if (direct) return { box: direct, exact: true };
  for (const ancestor of ancestorsOf(chart, nodeId).reverse()) {
    const box = find(ancestor.id);
    if (box) return { box, exact: false };
  }
  return undefined;
}
