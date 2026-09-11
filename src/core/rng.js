// Deterministic linear congruential generator.
// The world shares ONE stream across tree placement, node placement and terrain
// painting, so the order and count of rand() calls defines the layout.
// Reordering those calls reshuffles the entire map — append, never insert.
export function createRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export const rand = createRng(81);
