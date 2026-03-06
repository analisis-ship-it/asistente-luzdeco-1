import { google } from "googleapis";
import type { Row } from "@/lib/types";

const REQUIRED_SHEETS = [
  "reglas_generales",
  "marcas",
  "procesos",
  "faq_productos",
  "plantillas",
  "politicas",
];

const OPTIONAL_SHEETS = [
  "catalogo_productos_normalizado",
  "catalogo_productos",
];

function getAuth() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!clientEmail || !privateKey) {
    throw new Error("Faltan GOOGLE_SERVICE_ACCOUNT_EMAIL o GOOGLE_PRIVATE_KEY en variables de entorno.");
  }

  return new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
}

export async function fetchSheet(sheetName: string): Promise<Row[]> {
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
  if (!spreadsheetId) {
    throw new Error("Falta GOOGLE_SHEETS_ID en variables de entorno.");
  }

  const sheets = google.sheets({ version: "v4", auth: getAuth() });
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A:ZZ`,
  });

  const values = response.data.values || [];
  if (values.length === 0) return [];

  const headers = values[0].map((header) => String(header || "").trim());

  return values.slice(1).map((row) => {
    const record: Row = {};
    headers.forEach((header, index) => {
      record[header] = String(row[index] ?? "").trim();
    });
    return record;
  });
}

async function safeFetch(sheetName: string): Promise<Row[]> {
  try {
    return await fetchSheet(sheetName);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error || "");
    if (/Unable to parse range|Range .* not found|Requested entity was not found/i.test(message)) {
      return [];
    }
    throw error;
  }
}

export async function fetchKnowledgeBase() {
  const entries = await Promise.all([
    ...REQUIRED_SHEETS.map(async (name) => [name, await fetchSheet(name)] as const),
    ...OPTIONAL_SHEETS.map(async (name) => [name, await safeFetch(name)] as const),
  ]);
  return Object.fromEntries(entries) as Record<string, Row[]>;
}
