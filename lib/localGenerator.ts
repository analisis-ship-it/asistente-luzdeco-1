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
  detectedSku?: string;
  requestedAttribute?: string;
  requestedAttributeAliases?: string[];
};

function field(row: Row | undefined, aliases: string[]) {
  if (!row) return "";
  for (const alias of aliases) {
    const value = row[alias];
    if ((value || "").trim()) return value.trim();
  }
  return "";
}

function startsWithGreeting(message: string) {
  const m = normalize(message);
  return m.startsWith("hola") || m.startsWith("buen") || m.startsWith("que tal");
}

function isProductQuestion(input: GenerateInput) {
  return normalize(input.tipoCaso).includes("pregunta de producto");
}

function labelForAttribute(attr: string) {
  const labels: Record<string, string> = {
    potencia: "potencia",
    potencia_w: "potencia",
    voltaje: "voltaje",
    material: "material",
    color: "color",
    acabado_principal: "acabado",
    ip: "grado de protección IP",
    temperatura_color: "temperatura de color",
    flujo_luminoso: "flujo luminoso",
    dimensiones: "dimensiones",
    peso: "peso",
    garantia: "garantía",
    incluye: "incluye",
    no_incluye: "no incluye",
    uso_recomendado: "uso recomendado",
    uso: "uso recomendado",
  };
  return labels[attr] || attr;
}

function buildProductReply(input: GenerateInput, knowledge: Knowledge) {
  const product = knowledge.catalogo[0];
  if (!product) {
    return {
      diagnostico: "Consulta de producto sin coincidencia exacta",
      checklist: ["Confirmar modelo o SKU exacto"],
      advertencias: ["No inventar especificaciones técnicas no confirmadas"],
      respuesta: "Hola, gracias por escribirnos. Para confirmarte ese dato con precisión, compártenos por favor el modelo o SKU exacto del producto. Con eso te apoyamos de inmediato.",
    };
  }

  const productName = field(product, ["nombre_producto", "nombre_comercial", "descripcion_erp"]);
  const productRef = field(product, ["modelo", "sku_modelo", "sku", "codigo"]);
  const aliases = knowledge.requestedAttributeAliases?.length ? knowledge.requestedAttributeAliases : knowledge.requestedAttribute ? [knowledge.requestedAttribute] : [];
  const foundValue = field(product, aliases);

  let respuesta = "Hola, gracias por escribirnos. ";
  let diagnostico = `Consulta de producto: ${productName || productRef || "modelo identificado"}`;
  let checklist: string[] = [];
  const advertencias = ["Si hace falta un dato técnico adicional, confirmar con ficha antes de responder"]; 

  if (aliases.length && foundValue) {
    const label = labelForAttribute(aliases[0]);
    respuesta += `Con gusto te confirmamos que la ${label} del modelo ${productRef || productName} es ${foundValue}.`;
  } else if (aliases.length && !foundValue) {
    const label = labelForAttribute(aliases[0]);
    respuesta += `Ubicamos el modelo ${productRef || productName}, pero en la base actual no aparece el dato de ${label}. Si deseas, lo confirmamos internamente y te apoyamos con la respuesta exacta.`;
    checklist = ["Confirmar dato técnico en ficha o catálogo interno"];
  } else {
    const shortDesc = field(product, ["descripcion_corta", "descripcion_erp"]);
    const longDesc = field(product, ["descripcion_larga"]);
    const use = field(product, ["uso_recomendado", "uso"]);
    respuesta += `Ubicamos el producto ${productName || productRef}. ${shortDesc || longDesc || "Con gusto te compartimos más detalle si nos indicas qué atributo necesitas confirmar."}`;
    if (use) respuesta += ` Uso recomendado: ${use}.`;
  }

  const extraData = uniqueStrings([
    aliases.length ? "" : field(product, ["potencia", "potencia_w"]),
    aliases.length ? "" : field(product, ["voltaje"]),
    aliases.length ? "" : field(product, ["material"]),
  ]).filter(Boolean);
  if (!aliases.length && extraData.length) {
    respuesta += " Si deseas, también podemos compartirte más especificaciones del modelo.";
  }

  respuesta += " Quedamos atentos para apoyarte.";
  return { diagnostico, checklist, advertencias, respuesta };
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
    field(catalogo, ["descripcion_corta", "descripcion_erp"]),
    ""
  ).replace(/\[RESPUESTA\]/gi, "").trim();

  const checklistText = knowledge.checklist.length
    ? ` Para avanzar, por favor compártenos: ${knowledge.checklist.join(", ")}.`
    : "";

  let response = [greeting, empathy, processBase, checklistText]
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  if (!response.endsWith(".")) response += ".";
  response += " Quedamos atentos para apoyarte.";

  return response.replace(/\s+/g, " ").trim();
}

export function generateLocalResponse(input: GenerateInput, knowledge: Knowledge): GenerateOutput {
  if (isProductQuestion(input)) {
    const productResult = buildProductReply(input, knowledge);
    return {
      diagnostico: productResult.diagnostico,
      checklist: productResult.checklist,
      advertencias: productResult.advertencias,
      respuesta: productResult.respuesta,
      fuentes: knowledge.fuentes.length ? knowledge.fuentes : ["Google Sheets"],
    };
  }

  const proceso = knowledge.procesos[0];
  const faq = knowledge.faqs[0];
  const catalogo = knowledge.catalogo[0];

  const diagnostico =
    firstNonEmpty(
      proceso?.diagnostico,
      faq?.tema ? `Consulta sobre ${faq.tema}` : "",
      field(catalogo, ["nombre_producto", "nombre_comercial"]) ? `Consulta sobre ${field(catalogo, ["nombre_producto", "nombre_comercial"])}` : "",
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
