export function normalize(value?: string | null) {
  return (value || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function truthy(value?: string | null) {
  return ["si", "sí", "true", "1", "activo", "activa", "yes"].includes(normalize(value));
}

export function firstNonEmpty(...values: Array<string | undefined | null>) {
  return values.find((value) => (value || "").toString().trim().length > 0) || "";
}

export function uniqueStrings(values: Array<string | undefined | null>) {
  return [...new Set(values.map((v) => (v || "").trim()).filter(Boolean))];
}

export function containsAny(haystack: string, needles: string[]) {
  const h = normalize(haystack);
  return needles.some((needle) => h.includes(normalize(needle)));
}
