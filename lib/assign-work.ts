export function extractWorkPoints(text: string): string[] {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const points: string[] = [];

  for (const line of lines) {
    const match = /^(?:[-•*]|\d+\.)\s*(.+)$/.exec(line);
    const point = match?.[1].trim();
    if (point) points.push(point);
  }

  return points.length > 0 ? points : lines.slice(0, 5);
}
