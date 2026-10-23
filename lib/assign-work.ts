function descriptionLines(text: string) {
  return text
    .split(/\r\n?|\n/)
    .map((line) => {
      const trimmed = line.trim();
      const match = /^(?:[-•*]\s*(?:\[[ xX]\]\s*)?|\d+[.)]\s*|\[[ xX]\]\s*)(.*)$/.exec(trimmed);
      return { text: (match ? match[1] : trimmed).trim(), listed: Boolean(match) };
    })
    .filter((line) => line.text.replace(/[\u200B-\u200D\uFEFF]/g, "").trim().length > 0);
}

export function hasWorkDescription(text: string): boolean {
  return descriptionLines(text).length > 0;
}

export function extractWorkPoints(text: string): string[] {
  const lines = descriptionLines(text);
  const points = lines.filter((line) => line.listed).map((line) => line.text);
  return points.length > 0 ? points : lines.length > 1 ? lines.map((line) => line.text) : [];
}

export function workPointProgress(points: { completed: boolean }[]): number {
  if (points.length === 0) return 0;
  const completed = points.filter((point) => point.completed).length;
  return completed === points.length ? 100 : Math.min(99, Math.round((completed / points.length) * 100));
}

export function workPointStatus(type: "client" | "internal", status: string, progress: number): string {
  if (type === "internal") return progress === 100 ? "resolved" : "pending";
  if (progress === 100) return "completed";
  if (status === "issue" || status === "cancelled") return status;
  return progress > 0 ? "in_progress" : "pending";
}
