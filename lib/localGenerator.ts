import type { GenerateInput, GenerateOutput, Row } from "@/lib/types";
import { firstNonEmpty, normalize, uniqueStrings } from "@/lib/utils";

type Knowledge = {
  reglas: Row[];
  procesos: Row[];
  faqs: Row[];
  plantillas: Row[];
  politicas: Row[];
  catalogo: Row[];
  checklist: string[];
  advertencias: string[];
  fuentes: string[];
};

function startsWithGreeting(message: string) {
  const m = normalize(message);
  return m.startsWith("hola") || m.startsWith("buen") || m.startsWith("que tal");
}

function buildReplyBase(input: GenerateInput, knowledge: Knowledge) {
  const proceso = knowledge.procesos[0];
  const faq = knowledge.faqs[0];
  const plantilla = knowledge.plantillas[0];
  const catalogo = knowledge.catalogo[0];

  const greeting = startsWithGreeting(input.mensajeCliente)
    ? "Hola, gracias por escribirnos."
    : "Hola, con gusto te apoyamos.";

  const empathy = /garantia|defecto|reclamo|mediacion|devolucion/i.test(input.tipoCaso)
    ? "Lamentamos la situación y revisaremos tu caso."
    : "Con gusto te compartimos la información disponible.";

  const processBase = firstNonEmpty(
    proceso?.mensaje_base,
    faq?.respuesta_base,
    plantilla?.plantilla,
    catalogo?.descripcion_erp,
    ""
  );

  const pedidoText = input.pedido ? ` Tu número de pedido es ${input.pedido}.` : "";
  const skuText = input.sku ? ` Modelo/SKU de referencia: ${input.sku}.` : "";

  const checklistText = knowledge.checklist.length
    ? ` Para avanzar, por favor compártenos: ${knowledge.checklist.join(", ")}.`
    : "";

  let response = [greeting, empathy, processBase, checklistText, pedidoText, skuText]
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  if (!response.endsWith(".")) response += ".";
  response += " Quedamos atentos para apoyarte.";

  return response.replace(/\s+/g, " ").trim();
}

export function generateLocalResponse(input: GenerateInput, knowledge: Knowledge): GenerateOutput {
  const proceso = knowledge.procesos[0];
  const faq = knowledge.faqs[0];
  const catalogo = knowledge.catalogo[0];

  const diagnostico =
    firstNonEmpty(
      proceso?.diagnostico,
      faq?.tema ? `Consulta sobre ${faq.tema}` : "",
      catalogo?.nombre_comercial ? `Consulta sobre ${catalogo.nombre_comercial}` : "",
      `Caso de ${input.tipoCaso}`
    ) || `Caso de ${input.tipoCaso}`;

  const checklist = knowledge.checklist.length
    ? knowledge.checklist
    : uniqueStrings([
        input.pedido ? "Validar número de pedido" : "Solicitar número de pedido",
        /garantia|defecto|reclamo|devolucion/i.test(normalize(input.tipoCaso))
          ? "Solicitar evidencia del caso"
          : "Confirmar modelo o SKU",
      ]);

  const advertencias = knowledge.advertencias.length
    ? knowledge.advertencias
    : uniqueStrings([
        /garantia|defecto|reclamo/i.test(normalize(input.tipoCaso))
          ? "No prometer reemplazo o devolución sin revisión previa"
          : "No inventar especificaciones técnicas no confirmadas",
      ]);

  const respuesta = buildReplyBase(input, knowledge);

  return {
    diagnostico,
    checklist,
    advertencias,
    respuesta,
    fuentes: knowledge.fuentes.length ? knowledge.fuentes : ["Reglas locales", "Google Sheets"],
  };
}
