import { NextRequest, NextResponse } from "next/server";
import { fetchKnowledgeBase } from "@/lib/googleSheets";
import { selectKnowledge } from "@/lib/knowledge";
import { generateStructuredResponse } from "@/lib/openai";
import { buildPrompt } from "@/lib/prompt";
import type { GenerateInput } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as GenerateInput;

    if (!body.marca || !body.canal || !body.tipoCaso || !body.mensajeCliente) {
      return NextResponse.json({ error: "Faltan campos obligatorios." }, { status: 400 });
    }

    const base = await fetchKnowledgeBase();
    const knowledge = selectKnowledge(base, body);
    const prompt = buildPrompt(body, knowledge);
    const generated = await generateStructuredResponse(prompt);

    return NextResponse.json({
      ...generated,
      checklist: generated.checklist.length ? generated.checklist : knowledge.checklist,
      advertencias: generated.advertencias.length ? generated.advertencias : knowledge.advertencias,
      fuentes: knowledge.fuentes,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
