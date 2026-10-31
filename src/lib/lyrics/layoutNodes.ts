import { LyricWord } from './providers/types';
import { createSeededRandom, seededRange } from './seededRandom';

export interface LayoutNode {
  index: number;
  word: LyricWord;
  x: number; // in viewBox coordinates (e.g. 0 to 1000)
  y: number; // in viewBox coordinates (e.g. 0 to 600)
  width: number;
  height: number;
}

export interface LayoutEdge {
  fromIndex: number;
  toIndex: number;
  pathD: string;
  length: number;
}

export interface GraphLayout {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
}

function estimateWordSize(text: string): { width: number; height: number } {
  // Approximate width based on character count: ~14px per char + 20px padding
  return {
    width: Math.max(50, text.length * 15 + 24),
    height: 38,
  };
}

function checkCollision(
  x: number,
  y: number,
  w: number,
  h: number,
  existing: LayoutNode[],
  margin = 25
): boolean {
  for (const n of existing) {
    const overlapX = Math.abs(x - n.x) < (w + n.width) / 2 + margin;
    const overlapY = Math.abs(y - n.y) < (h + n.height) / 2 + margin;
    if (overlapX && overlapY) return true;
  }
  return false;
}

/**
 * 1. Constellation Layout:
 * Poisson-disc / rejection sampling layout with safe margins and sequential star-to-star connections.
 */
export function generateConstellationLayout(
  words: LyricWord[],
  seedVal: number | string,
  viewWidth = 1000,
  viewHeight = 600
): GraphLayout {
  const rand = createSeededRandom(seedVal);
  const nodes: LayoutNode[] = [];
  const padX = 120;
  const padY = 90;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const { width, height } = estimateWordSize(word.text);

    let placed = false;
    let attempts = 0;
    let candidateX = 500;
    let candidateY = 300;

    // Sequential progression across canvas from left to right with vertical variation
    const xBase = padX + (i / Math.max(1, words.length - 1)) * (viewWidth - padX * 2);

    while (!placed && attempts < 50) {
      attempts++;
      candidateX = xBase + seededRange(rand, -40, 40);
      candidateY = padY + rand() * (viewHeight - padY * 2);

      if (!checkCollision(candidateX, candidateY, width, height, nodes, 30)) {
        placed = true;
      }
    }

    nodes.push({
      index: i,
      word,
      x: Math.max(padX, Math.min(viewWidth - padX, candidateX)),
      y: Math.max(padY, Math.min(viewHeight - padY, candidateY)),
      width,
      height,
    });
  }

  // Sequential connecting edges
  const edges: LayoutEdge[] = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    const a = nodes[i];
    const b = nodes[i + 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.hypot(dx, dy);
    edges.push({
      fromIndex: i,
      toIndex: i + 1,
      pathD: `M ${a.x} ${a.y} L ${b.x} ${b.y}`,
      length: dist,
    });
  }

  return { nodes, edges };
}

/**
 * 2. Branches Layout:
 * Git-graph / tree layout: A main trunk with branches smoothly curving off.
 */
export function generateBranchesLayout(
  words: LyricWord[],
  seedVal: number | string,
  viewWidth = 1000,
  viewHeight = 600
): GraphLayout {
  const rand = createSeededRandom(seedVal);
  const nodes: LayoutNode[] = [];
  const edges: LayoutEdge[] = [];

  const centerY = viewHeight / 2;
  const padX = 100;
  const stepX = (viewWidth - padX * 2) / Math.max(1, words.length);

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const { width, height } = estimateWordSize(word.text);

    // Main line or alternating branch offset
    const isBranch = i % 2 !== 0;
    const branchDir = i % 4 === 1 ? -1 : 1;
    const offsetY = isBranch ? branchDir * seededRange(rand, 110, 190) : seededRange(rand, -30, 30);

    const x = padX + i * stepX + stepX * 0.5;
    const y = Math.max(80, Math.min(viewHeight - 80, centerY + offsetY));

    nodes.push({
      index: i,
      word,
      x,
      y,
      width,
      height,
    });

    if (i > 0) {
      const prev = nodes[i - 1];
      const cx1 = prev.x + (x - prev.x) * 0.5;
      const cy1 = prev.y;
      const cx2 = prev.x + (x - prev.x) * 0.5;
      const cy2 = y;
      const pathD = `M ${prev.x} ${prev.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x} ${y}`;
      const dist = Math.hypot(x - prev.x, y - prev.y) * 1.15;
      edges.push({
        fromIndex: i - 1,
        toIndex: i,
        pathD,
        length: dist,
      });
    }
  }

  return { nodes, edges };
}

/**
 * 3. Web Layout:
 * Radial spider-web: nodes arranged around a central hub connected circumferentially and radially.
 */
export function generateWebLayout(
  words: LyricWord[],
  seedVal: number | string,
  viewWidth = 1000,
  viewHeight = 600
): GraphLayout {
  const rand = createSeededRandom(seedVal);
  const nodes: LayoutNode[] = [];
  const edges: LayoutEdge[] = [];

  const centerX = viewWidth / 2;
  const centerY = viewHeight / 2;
  const count = words.length;

  for (let i = 0; i < count; i++) {
    const word = words[i];
    const { width, height } = estimateWordSize(word.text);

    // Distribute angles evenly around 360 degrees plus small jitter
    const baseAngle = (i / count) * 2 * Math.PI - Math.PI / 2;
    const angle = baseAngle + seededRange(rand, -0.15, 0.15);

    // Stagger radius between two concentric web rings (~150px and ~240px)
    const ringRadius = i % 2 === 0 ? seededRange(rand, 140, 180) : seededRange(rand, 210, 260);

    const x = centerX + Math.cos(angle) * ringRadius;
    const y = centerY + Math.sin(angle) * ringRadius;

    nodes.push({
      index: i,
      word,
      x: Math.max(90, Math.min(viewWidth - 90, x)),
      y: Math.max(70, Math.min(viewHeight - 70, y)),
      width,
      height,
    });
  }

  // Connect sequentially along perimeter
  for (let i = 0; i < nodes.length; i++) {
    const nextIdx = (i + 1) % nodes.length;
    const a = nodes[i];
    const b = nodes[nextIdx];
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    edges.push({
      fromIndex: i,
      toIndex: nextIdx,
      pathD: `M ${a.x} ${a.y} L ${b.x} ${b.y}`,
      length: dist,
    });
  }

  // Also radial hub spoke connections from center
  for (let i = 0; i < nodes.length; i += 2) {
    const n = nodes[i];
    const dist = Math.hypot(n.x - centerX, n.y - centerY);
    edges.push({
      fromIndex: -1, // center
      toIndex: i,
      pathD: `M ${centerX} ${centerY} L ${n.x} ${n.y}`,
      length: dist,
    });
  }

  return { nodes, edges };
}
