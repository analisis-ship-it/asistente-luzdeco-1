import type { GenerateInput, Row } from "@/lib/types";
import { containsAny, firstNonEmpty, normalize, truthy, uniqueStrings } from "@/lib/utils";

function filterActive(rows: Row[]) {
  return rows.filter((row) => !row.activo || truthy(row.activo));
}

function sameOrGeneral(value: string, target: string) {
  const v = normalize(value);
  const t = normalize(target);
  return !v || v === t || ["general", "todas", "todas las marcas", "todos", "todos los canales"].includes(v);
}

function field(row: Row, aliases: string[]) {
  for (const alias of aliases) {
    const value = row[alias];
    if ((value || "").trim()) return value.trim();
  }
  return "";
}

function brandMatches(row: Row, inputMarca: string) {
  const brandRow = normalize(field(row, ["marca", "marca_normalizada"]));
  const brandInput = normalize(inputMarca).split("/")[0].trim();
  return !brandRow || brandRow.includes(brandInput) || brandInput.includes(brandRow);
}

function extractPossibleSku(message: string) {
  const raw = message || "";
  const patterns = [
    /(?:sku|modelo|codigo|c[oó]digo)\s*[:#-]?\s*([A-Za-z0-9._\/-]{2,})/i,
    /sku\s+([A-Za-z0-9._\/-]{2,})/i,
  ];
  for (const pattern of patterns) {
    const match = raw.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return "";
}

function requestedAttribute(message: string) {
  const m = normalize(message);
  const rules = [
    { aliases: ["potencia", "potencia_w"], words: ["potencia", "watts", "watt", "w ", "cuantos watts", "cuánta potencia"] },
    { aliases: ["voltaje"], words: ["voltaje", "voltios", "volts", "v "] },
    { aliases: ["material"], words: ["material", "de que material", "de qué material"] },
    { aliases: ["color", "acabado_principal"], words: ["color", "acabado"] },
    { aliases: ["ip"], words: ["ip", "grado de proteccion", "grado de protección"] },
    { aliases: ["temperatura_color"], words: ["temperatura", "temperatura de color", "kelvin", "k ", "luz fria", "luz cálida", "luz calida"] },
    { aliases: ["flujo_luminoso"], words: ["lumens", "lumen", "lm", "flujo luminoso"] },
    { aliases: ["dimensiones"], words: ["medidas", "dimensiones", "tamano", "tamaño"] },
    { aliases: ["peso"], words: ["peso", "cuanto pesa", "cuánto pesa"] },
    { aliases: ["garantia"], words: ["garantia", "garantía"] },
    { aliases: ["incluye"], words: ["incluye", "viene con", "trae"] },
    { aliases: ["no_incluye"], words: ["no incluye", "no viene con"] },
    { aliases: ["uso_recomendado", "uso"], words: ["uso", "para que sirve", "donde se usa", "dónde se usa"] },
  ];
  return rules.find((rule) => rule.words.some((word) => m.includes(normalize(word))));
}

export function selectKnowledge(base: Record<string, Row[]>, input: GenerateInput) {
  const reglas = filterActive(base.reglas_generales || []);
  const procesos = filterActive(base.procesos || []).filter(
    (row) => sameOrGeneral(row.marca, input.marca) && sameOrGeneral(row.canal, input.canal) && sameOrGeneral(row.tipo_caso, input.tipoCaso)
  );

  const faqRows = filterActive(base.faq_productos || []).filter((row) => sameOrGeneral(row.marca, input.marca));
  const templateRows = filterActive(base.plantillas || []).filter(
    (row) => sameOrGeneral(row.marca, input.marca) && sameOrGeneral(row.canal, input.canal) && sameOrGeneral(row.tipo_caso, input.tipoCaso)
  );
  const politicas = filterActive(base.politicas || []);

  const catalogSource = filterActive(base.catalogo_productos_normalizado || []).length
    ? filterActive(base.catalogo_productos_normalizado || [])
    : filterActive(base.catalogo_productos || []);

  const messageScope = `${input.mensajeCliente} ${input.contextoInterno || ""} ${input.sku || ""}`;
  const extractedSku = input.sku || extractPossibleSku(messageScope);
  const requested = requestedAttribute(messageScope);

  const matchedProcesoRows = procesos.filter((row) => {
    const candidates = [row.subescenario, row.condicion, row.diagnostico, row.accion].filter(Boolean);
    if (candidates.length === 0) return true;
    return containsAny(messageScope, candidates) || normalize(input.tipoCaso) === normalize(row.tipo_caso);
  });

  const matchedFaqRows = faqRows.filter((row) => {
    const byMessage = containsAny(messageScope, [row.tema, row.pregunta_tipo, row.nota_interna].filter(Boolean) as string[]);
    return byMessage;
  }).slice(0, 8);

  const catalogRows = catalogSource.filter((row) => {
    const skuCandidates = [field(row, ["sku", "codigo"]), field(row, ["modelo", "sku_modelo"]), field(row, ["nombre_producto", "nombre_comercial"]), field(row, ["sku_modelo"]), field(row, ["codigo"])].filter(Boolean);
    const exactSku = extractedSku && skuCandidates.some((v) => normalize(v) === normalize(extractedSku));
    const byMessage = containsAny(messageScope, skuCandidates) || containsAny(messageScope, [field(row, ["descripcion_corta", "descripcion_erp"]), field(row, ["descripcion_larga"]), field(row, ["nombre_producto", "nombre_comercial"]), field(row, ["sku", "codigo"]), field(row, ["modelo", "sku_modelo"]), field(row, ["potencia", "potencia_w"]), field(row, ["voltaje"]), field(row, ["material"]), field(row, ["color", "acabado_principal"]), field(row, ["ip"]), field(row, ["temperatura_color"]), field(row, ["flujo_luminoso"]), field(row, ["uso_recomendado", "uso"]), ].filter(Boolean) as string[]);
    return Boolean(exactSku || (brandMatches(row, input.marca) && byMessage));
  }).slice(0, 6);

  const checklist = uniqueStrings(
    matchedProcesoRows.flatMap((row) => (row.pedir_al_cliente || "").split("|").map((item) => item.trim()))
  );

  const advertencias = uniqueStrings([
    ...matchedProcesoRows.flatMap((row) => (row.advertencias || "").split("|").map((item) => item.trim())),
    ...politicas.slice(0, 6).map((row) => `${firstNonEmpty(row.tema)}: ${firstNonEmpty(row.detalle)}`),
  ]).slice(0, 10);

  const fuentes = uniqueStrings([
    ...matchedProcesoRows.map((row) => `Proceso ${row.id_proceso || "sin-id"}`),
    ...matchedFaqRows.map((row) => `FAQ ${row.tema || row.pregunta_tipo || "general"}`),
    ...catalogRows.map((row) => `Catálogo ${field(row, ["modelo", "sku_modelo", "sku", "codigo", "nombre_producto", "nombre_comercial"]) || "producto"}`),
  ]);

  return {
    reglas,
    procesos: matchedProcesoRows.length ? matchedProcesoRows : procesos.slice(0, 6),
    faqs: matchedFaqRows,
    plantillas: templateRows.slice(0, 4),
    politicas: politicas.slice(0, 8),
    catalogo: catalogRows,
    checklist,
    advertencias,
    fuentes,
    detectedSku: extractedSku,
    requestedAttribute: requested?.aliases?.[0] || "",
    requestedAttributeAliases: requested?.aliases || [],
  };
}
