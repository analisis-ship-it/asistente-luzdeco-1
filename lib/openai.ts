import OpenAI from "openai";
import type { GenerateOutput } from "@/lib/types";

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Falta OPENAI_API_KEY en variables de entorno.");
  return new OpenAI({ apiKey });
}

function safeJsonParse(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("No fue posible parsear el JSON del modelo.");
  }
}

export async function generateStructuredResponse(prompt: string): Promise<GenerateOutput> {
  const client = getClient();
  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";

  const response = await client.responses.create({
    model,
    input: prompt,
    temperature: 0.2,
  });

  const text = response.output_text?.trim();
  if (!text) {
    throw new Error("El modelo no devolvió texto.");
  }

  const parsed = safeJsonParse(text) as Partial<GenerateOutput>;

  return {
    diagnostico: parsed.diagnostico || "Sin diagnóstico sugerido",
    checklist: Array.isArray(parsed.checklist) ? parsed.checklist.filter(Boolean) : [],
    advertencias: Array.isArray(parsed.advertencias) ? parsed.advertencias.filter(Boolean) : [],
    respuesta: parsed.respuesta || "No se pudo generar una respuesta.",
    fuentes: [],
  };
}
