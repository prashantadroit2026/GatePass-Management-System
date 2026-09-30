import { cn } from "@/lib/utils";

/** Deterministic pseudo-random generator so a pass ID always renders the same QR-style pattern. */
function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function buildMatrix(value: string, size = 25): boolean[][] {
  let seed = hash(value);
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };
  const matrix: boolean[][] = Array.from({ length: size }, () => Array<boolean>(size).fill(false));

  const drawFinder = (row: number, col: number) => {
    for (let r = 0; r < 7; r += 1) {
      for (let c = 0; c < 7; c += 1) {
        const edge = r === 0 || r === 6 || c === 0 || c === 6;
        const core = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        matrix[row + r][col + c] = edge || core;
      }
    }
  };

  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      matrix[r][c] = rand() > 0.52;
    }
  }

  const clear = (row: number, col: number, h = 8, w = 8) => {
    for (let r = 0; r < h; r += 1) {
      for (let c = 0; c < w; c += 1) {
        const rr = row + r;
        const cc = col + c;
        if (rr >= 0 && rr < size && cc >= 0 && cc < size) matrix[rr][cc] = false;
      }
    }
  };

  clear(0, 0);
  clear(0, size - 7, 8, 7);
  clear(size - 7, 0, 7, 8);
  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  for (let i = 8; i < size - 8; i += 1) {
    matrix[6][i] = i % 2 === 0;
    matrix[i][6] = i % 2 === 0;
  }

  return matrix;
}

export function QrCodePlaceholder({
  value,
  size = 168,
  className,
}: {
  value: string;
  size?: number;
  className?: string;
}) {
  const matrix = buildMatrix(value);
  const dim = matrix.length;
  return (
    <div
      className={cn("rounded-xl border border-border bg-white p-3 shadow-sm", className)}
      style={{ width: size, height: size }}
      aria-label={`QR code for ${value}`}
      role="img"
    >
      <svg viewBox={`0 0 ${dim} ${dim}`} className="h-full w-full" shapeRendering="crispEdges">
        <rect width={dim} height={dim} fill="#ffffff" />
        {matrix.map((row, r) =>
          row.map((on, c) =>
            on ? <rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill="#0f172a" /> : null,
          ),
        )}
      </svg>
    </div>
  );
}
