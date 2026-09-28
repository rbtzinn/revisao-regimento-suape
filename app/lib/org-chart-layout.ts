import type { OrgChart } from "@/app/lib/org-chart";

export const NODE_WIDTH = 264;
export const NODE_HEIGHT = 80;
/** Espaço vertical entre um nível e o seguinte (a barra fica no meio). */
const LEVEL_GAP = 96;
/** Espaço entre caixas lado a lado. */
const SIBLING_GAP = 28;
/** Espaço entre as diretorias na linha de baixo. */
const DIRECTORATE_GAP = 96;
/** Espaço livre no meio da faixa das assessorias, por onde passa o tronco. */
const TRUNK_GAP = 120;
/** Recuo das caixas empilhadas em relação à caixa de cima. */
const STACK_INDENT = 56;
const STACK_GAP = 18;
/** Linha vertical que desce pela esquerda das caixas empilhadas. */
const SPINE_OFFSET = 28;

/** Mesma ordem das diretorias na primeira página do PDF. */
const DIRECTORATE_ORDER = ["daf", "dinfra", "dgi", "dgp", "dsi", "drig", "djur"];

/** Próxima caixa da cadeia principal; a Presidência é o fim dela. */
const CHAIN_NEXT: Record<string, string> = {
  assembleia: "conselho-administracao",
  "conselho-administracao": "presidencia",
};

export type Point = { x: number; y: number };
export type Bounds = { minX: number; minY: number; maxX: number; maxY: number };
/** Linha do organograma; `parentId` e `childId` servem para destacar e apagar. */
export type OrgLine = { points: Point[]; parentId: string; childId?: string };
export type OrgLayout = {
  positions: Map<string, Point>;
  lines: OrgLine[];
  bounds: Bounds;
};

/**
 * Pedaço já desenhado do organograma. A caixa do topo fica centrada em
 * x = 0, com o topo em y = 0; `minX`/`maxX` e `height` dão a área ocupada.
 */
type Block = {
  positions: Map<string, Point>;
  lines: OrgLine[];
  minX: number;
  maxX: number;
  height: number;
};

function single(id: string): Block {
  return {
    positions: new Map([[id, { x: 0, y: NODE_HEIGHT / 2 }]]),
    lines: [],
    minX: -NODE_WIDTH / 2,
    maxX: NODE_WIDTH / 2,
    height: NODE_HEIGHT,
  };
}

function place(target: Block, block: Block, dx: number, dy: number) {
  for (const [id, point] of block.positions) {
    target.positions.set(id, { x: point.x + dx, y: point.y + dy });
  }
  for (const line of block.lines) {
    target.lines.push({
      ...line,
      points: line.points.map((point) => ({ x: point.x + dx, y: point.y + dy })),
    });
  }
  target.minX = Math.min(target.minX, block.minX + dx);
  target.maxX = Math.max(target.maxX, block.maxX + dx);
  target.height = Math.max(target.height, block.height + dy);
}

/** Filhas empilhadas embaixo, ligadas por uma linha vertical à esquerda. */
function stack(chart: OrgChart, id: string): Block {
  const node = chart.nodes.get(id);
  const block = single(id);
  if (!node || node.childIds.length === 0) return block;

  const spineX = -NODE_WIDTH / 2 + SPINE_OFFSET;
  const childX = -NODE_WIDTH / 2 + STACK_INDENT + NODE_WIDTH / 2;
  let cursor = NODE_HEIGHT + STACK_GAP;
  let lastY = NODE_HEIGHT / 2;

  for (const childId of node.childIds) {
    const child = stack(chart, childId);
    place(block, child, childX, cursor);
    lastY = cursor + NODE_HEIGHT / 2;
    block.lines.push({
      parentId: id,
      childId,
      points: [
        { x: spineX, y: lastY },
        { x: childX, y: lastY },
      ],
    });
    cursor += child.height + STACK_GAP;
  }

  block.lines.push({
    parentId: id,
    points: [
      { x: spineX, y: NODE_HEIGHT / 2 },
      { x: spineX, y: lastY },
    ],
  });
  return block;
}

/**
 * Coloca blocos lado a lado a partir de `top`, com uma barra horizontal em
 * `barY` e uma descida até cada caixa. Devolve o x da primeira e da última.
 */
function row(
  target: Block,
  parentId: string,
  blocks: Array<{ id: string; block: Block }>,
  startX: number,
  top: number,
  gap: number,
) {
  let cursor = startX;
  const centers: number[] = [];
  for (const { id, block } of blocks) {
    const dx = cursor - block.minX;
    place(target, block, dx, top);
    centers.push(dx);
    target.lines.push({
      parentId,
      childId: id,
      points: [
        { x: dx, y: top - LEVEL_GAP / 2 },
        { x: dx, y: top + NODE_HEIGHT / 2 },
      ],
    });
    cursor = dx + block.maxX + gap;
  }
  return { first: centers[0], last: centers[centers.length - 1], end: cursor - gap };
}

function rowWidth(blocks: Array<{ block: Block }>, gap: number) {
  return (
    blocks.reduce((sum, { block }) => sum + block.maxX - block.minX, 0) +
    gap * Math.max(0, blocks.length - 1)
  );
}

/** Diretoria: filhas em linha, cada uma com as suas empilhadas embaixo. */
function directorate(chart: OrgChart, id: string): Block {
  const node = chart.nodes.get(id);
  if (!node || node.childIds.length === 0) return single(id);
  const allLeaves = node.childIds.every(
    (childId) => (chart.nodes.get(childId)?.childIds.length ?? 0) === 0,
  );
  if (allLeaves) return stack(chart, id);

  const block = single(id);
  const children = node.childIds.map((childId) => ({
    id: childId,
    block: stack(chart, childId),
  }));
  const top = NODE_HEIGHT + LEVEL_GAP;
  const width = rowWidth(children, SIBLING_GAP);
  const placed = row(block, id, children, -width / 2, top, SIBLING_GAP);
  addBar(block, id, placed.first, placed.last, top);
  return block;
}

function addBar(block: Block, parentId: string, first: number, last: number, top: number) {
  const barY = top - LEVEL_GAP / 2;
  block.lines.push({
    parentId,
    points: [
      { x: 0, y: NODE_HEIGHT / 2 },
      { x: 0, y: barY },
    ],
  });
  if (last > first) {
    block.lines.push({
      parentId,
      points: [
        { x: first, y: barY },
        { x: last, y: barY },
      ],
    });
  }
}

/**
 * Caixa da cadeia principal (Assembleia → Conselho → Presidência): as
 * unidades de apoio abrem numa faixa dividida pelo tronco, e o tronco
 * segue até o próximo nível (outra caixa da cadeia ou a linha das diretorias).
 */
function trunk(chart: OrgChart, id: string): Block {
  const node = chart.nodes.get(id);
  const block = single(id);
  if (!node) return block;

  const next = CHAIN_NEXT[id];
  const isHub = !next;
  const lower = next
    ? [next]
    : node.childIds
        .filter((childId) => chart.nodes.get(childId)?.highlight)
        .sort(
          (a, b) =>
            (DIRECTORATE_ORDER.indexOf(a) + 1 || 99) -
            (DIRECTORATE_ORDER.indexOf(b) + 1 || 99),
        );
  const support = node.childIds.filter((childId) => !lower.includes(childId));

  let cursor = NODE_HEIGHT;
  let trunkEnd = NODE_HEIGHT / 2;

  if (support.length > 0) {
    const top = cursor + LEVEL_GAP;
    const blocks = support.map((childId) => ({ id: childId, block: stack(chart, childId) }));
    const half = Math.ceil(blocks.length / 2);
    const left = blocks.slice(0, half);
    const right = blocks.slice(half);
    const barY = top - LEVEL_GAP / 2;

    const leftPlaced = row(
      block,
      id,
      left,
      -TRUNK_GAP / 2 - rowWidth(left, SIBLING_GAP),
      top,
      SIBLING_GAP,
    );
    const rightPlaced = right.length
      ? row(block, id, right, TRUNK_GAP / 2, top, SIBLING_GAP)
      : undefined;
    block.lines.push({
      parentId: id,
      points: [
        { x: leftPlaced.first, y: barY },
        { x: rightPlaced?.last ?? 0, y: barY },
      ],
    });

    const tallest = Math.max(...blocks.map(({ block: item }) => item.height));
    cursor = top + tallest;
    trunkEnd = barY;
  }

  if (lower.length > 0) {
    const top = cursor + LEVEL_GAP;
    if (!isHub) {
      const child = trunk(chart, lower[0]);
      place(block, child, 0, top);
      trunkEnd = top + NODE_HEIGHT / 2;
    } else {
      const blocks = lower.map((childId) => ({
        id: childId,
        block: directorate(chart, childId),
      }));
      const width = rowWidth(blocks, DIRECTORATE_GAP);
      const placed = row(block, id, blocks, -width / 2, top, DIRECTORATE_GAP);
      block.lines.push({
        parentId: id,
        points: [
          { x: placed.first, y: top - LEVEL_GAP / 2 },
          { x: placed.last, y: top - LEVEL_GAP / 2 },
        ],
      });
      trunkEnd = top - LEVEL_GAP / 2;
    }
  }

  if (trunkEnd > NODE_HEIGHT / 2) {
    block.lines.push({
      parentId: id,
      points: [
        { x: 0, y: NODE_HEIGHT / 2 },
        { x: 0, y: trunkEnd },
      ],
    });
  }
  return block;
}


/**
 * Organograma de cima para baixo, como no PDF: Assembleia Geral no topo,
 * conselhos no tronco, as unidades da Presidência numa faixa e as
 * diretorias lado a lado embaixo, cada uma com a sua estrutura.
 */
export function layoutOrgChart(chart: OrgChart): OrgLayout {
  const block = trunk(chart, chart.rootId);
  return {
    positions: block.positions,
    lines: block.lines,
    bounds: boundsOf([...block.positions.values()]),
  };
}

export function boundsOf(points: Point[]): Bounds {
  if (points.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const point of points) {
    minX = Math.min(minX, point.x - NODE_WIDTH / 2);
    maxX = Math.max(maxX, point.x + NODE_WIDTH / 2);
    minY = Math.min(minY, point.y - NODE_HEIGHT / 2);
    maxY = Math.max(maxY, point.y + NODE_HEIGHT / 2);
  }
  return { minX, minY, maxX, maxY };
}

export function linePath(line: OrgLine) {
  return line.points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
}
