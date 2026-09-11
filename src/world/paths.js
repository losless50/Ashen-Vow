/** Rounded bends shared by the ground painter and vegetation exclusion. */
export function roundedTrail(points) {
  const result = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const previous = points[i - 1], corner = points[i], next = points[i + 1];
    const from = previous.map((v, axis) => (v + corner[axis]) / 2);
    const to = next.map((v, axis) => (v + corner[axis]) / 2);
    if (i === 1) result.push(from);
    for (let j = 1; j <= 8; j++) {
      const t = j / 8, u = 1 - t;
      result.push(from.map((v, axis) => u * u * v + 2 * u * t * corner[axis] + t * t * to[axis]));
    }
  }
  result.push(points[points.length - 1]);
  return result;
}

