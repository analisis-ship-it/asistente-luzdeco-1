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

  const messageScope = `${input.mensajeCliente} ${input.contextoInterno || ""} ${input.sku || ""}`;

  const matchedProcesoRows = procesos.filter((row) => {
    const candidates = [row.subescenario, row.condicion, row.diagnostico, row.accion].filter(Boolean);
    if (candidates.length === 0) return true;
    return containsAny(messageScope, candidates) || normalize(input.tipoCaso) === normalize(row.tipo_caso);
  });

  const matchedFaqRows = faqRows.filter((row) => {
    const exactSku = input.sku && normalize(row.codigo_o_modelo) === normalize(input.sku);
    const byMessage = containsAny(messageScope, [row.codigo_o_modelo, row.tema, row.pregunta_tipo].filter(Boolean) as string[]);
    return Boolean(exactSku || byMessage);
  }).slice(0, 8);

  const catalogRows = filterActive(base.catalogo_productos || []).filter((row) => {
    const skuMatches = input.sku && [row.codigo, row.sku_modelo, row.nombre_comercial].some((v) => normalize(v) === normalize(input.sku));
    const messageMatches = containsAny(messageScope, [row.codigo, row.sku_modelo, row.nombre_comercial, row.descripcion_erp].filter(Boolean) as string[]);
    const brandMatches = normalize(row.marca_normalizada).includes(normalize(input.marca).split("/")[0].trim());
    return Boolean(skuMatches || (brandMatches && messageMatches));
  }).slice(0, 5);

  const checklist = uniqueStrings(
    matchedProcesoRows.flatMap((row) => (row.pedir_al_cliente || "").split("|").map((item) => item.trim()))
  );

  const advertencias = uniqueStrings([
    ...matchedProcesoRows.flatMap((row) => (row.advertencias || "").split("|").map((item) => item.trim())),
    ...politicas.slice(0, 6).map((row) => `${firstNonEmpty(row.tema)}: ${firstNonEmpty(row.detalle)}`),
  ]).slice(0, 10);

  const fuentes = uniqueStrings([
    ...matchedProcesoRows.map((row) => `Proceso ${row.id_proceso || "sin-id"}`),
    ...matchedFaqRows.map((row) => `FAQ ${row.codigo_o_modelo || row.tema || "general"}`),
    ...catalogRows.map((row) => `Catálogo ${row.sku_modelo || row.codigo || row.nombre_comercial || "producto"}`),
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
  };
}
