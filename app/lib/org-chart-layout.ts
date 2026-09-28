import type { OrgChart } from "@/app/lib/org-chart";

export const NODE_WIDTH = 264;
export const NODE_HEIGHT = 80;
const COLUMN_GAP = 84;
const ROW_GAP = 16;
const BRANCH_GAP = 34;
const CHAIN_GAP = 150;

export type Point = { x: number; y: number };
export type Bounds = { minX: number; minY: number; maxX: number; maxY: number };
export type OrgLayout = {
  positions: Map<string, Point>;
  bounds: Bounds;
  hubId: string;
};

/**
 * Mapa mental em duas alas: a Diretoria da Presidência fica no centro, com
 * suas unidades e diretorias abrindo para a esquerda e para a direita. Acima
 * dela, em coluna, ficam o Conselho de Administração e a Assembleia Geral,
 * com os órgãos colegiados ao lado, como na primeira página do PDF.
 */
export function layoutOrgChart(chart: OrgChart, hubId = "presidencia"): OrgLayout {
  const positions = new Map<string, Point>();
  const hub = chart.nodes.get(hubId);
  if (!hub) throw new Error(`Nó central ausente: ${hubId}`);

  const column = NODE_WIDTH + COLUMN_GAP;

  for (const side of [-1, 1] as const) {
    const branches = hub.childIds.filter(
      (id) => chart.nodes.get(id)?.side === side,
    );
    let cursor = 0;
    const placed: string[] = [];

    const place = (id: string, level: number): number => {
      const node = chart.nodes.get(id);
      if (!node) return cursor;
      placed.push(id);
      let y: number;
      if (node.childIds.length === 0) {
        y = cursor + NODE_HEIGHT / 2;
        cursor += NODE_HEIGHT + ROW_GAP;
      } else {
        const childYs = node.childIds.map((childId) => place(childId, level + 1));
        y = (childYs[0] + childYs[childYs.length - 1]) / 2;
      }
      positions.set(id, { x: side * level * column, y });
      return y;
    };

    branches.forEach((id, index) => {
      if (index > 0) cursor += BRANCH_GAP;
      place(id, 1);
    });

    // Centraliza a ala na altura da Presidência.
    const offset = (cursor - ROW_GAP) / 2;
    for (const id of placed) {
      const point = positions.get(id);
      if (point) point.y -= offset;
    }
  }

  positions.set(hubId, { x: 0, y: 0 });

  // Cadeia de governança acima da Presidência.
  let wingTop = 0;
  for (const point of positions.values()) {
    wingTop = Math.min(wingTop, point.y - NODE_HEIGHT / 2);
  }

  const chain: string[] = [];
  for (let id = hub.parentId; id; id = chart.nodes.get(id)?.parentId) chain.push(id);

  let chainY = wingTop - CHAIN_GAP;
  let childId = hubId;
  for (const id of chain) {
    const node = chart.nodes.get(id);
    if (!node) continue;
    positions.set(id, { x: 0, y: chainY });

    const siblings = node.childIds.filter((sibling) => sibling !== childId);
    const half = Math.ceil(siblings.length / 2);
    const leftGroup = siblings.slice(0, half);
    const rightGroup = siblings.slice(half);

    for (const [group, side] of [
      [leftGroup, -1],
      [rightGroup, 1],
    ] as const) {
      const span = (group.length - 1) * (NODE_HEIGHT + ROW_GAP);
      group.forEach((sibling, index) => {
        positions.set(sibling, {
          x: side * column,
          y: chainY - span / 2 + index * (NODE_HEIGHT + ROW_GAP),
        });
      });
    }

    const tallest = Math.max(leftGroup.length, rightGroup.length, 1);
    chainY -= CHAIN_GAP + ((tallest - 1) * (NODE_HEIGHT + ROW_GAP)) / 2;
    childId = id;
  }

  return { positions, bounds: boundsOf([...positions.values()]), hubId };
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

/** Caminho da linha entre pai e filho, em coordenadas do mapa. */
export function edgePath(parent: Point, child: Point) {
  if (Math.abs(child.x - parent.x) < 1) {
    const down = child.y > parent.y ? 1 : -1;
    const startY = parent.y + (down * NODE_HEIGHT) / 2;
    const endY = child.y - (down * NODE_HEIGHT) / 2;
    return `M ${parent.x} ${startY} L ${child.x} ${endY}`;
  }
  const direction = child.x > parent.x ? 1 : -1;
  const startX = parent.x + (direction * NODE_WIDTH) / 2;
  const endX = child.x - (direction * NODE_WIDTH) / 2;
  const middle = (startX + endX) / 2;
  return `M ${startX} ${parent.y} C ${middle} ${parent.y}, ${middle} ${child.y}, ${endX} ${child.y}`;
}
