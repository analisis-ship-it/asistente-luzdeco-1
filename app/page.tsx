"use client";

import { useMemo, useState } from "react";
import { ResultPanel } from "@/components/ResultPanel";

const MARCAS = ["LuzDeco", "V.com / Ventiladores", "Coolfan", "Estevez", "Narvik", "Otra"];
const CANALES = ["Mercado Libre", "Amazon", "Shopify", "WhatsApp", "Otro"];
const TIPOS = [
  "Pregunta de producto",
  "Postventa",
  "Garantía / defecto",
  "Reclamo / mediación",
  "Devolución",
  "Facturación",
];
const PRIORIDADES = ["Normal", "Delicado", "Urgente"];

type Result = {
  diagnostico: string;
  checklist: string[];
  advertencias: string[];
  respuesta: string;
  fuentes?: string[];
};

export default function Page() {
  const [marca, setMarca] = useState("LuzDeco");
  const [canal, setCanal] = useState("Mercado Libre");
  const [tipoCaso, setTipoCaso] = useState("Pregunta de producto");
  const [prioridad, setPrioridad] = useState("Normal");
  const [mensajeCliente, setMensajeCliente] = useState("");
  const [contextoInterno, setContextoInterno] = useState("");
  const [pedido, setPedido] = useState("");
  const [sku, setSku] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  const canGenerate = useMemo(() => Boolean(marca && canal && tipoCaso && mensajeCliente.trim()), [marca, canal, tipoCaso, mensajeCliente]);

  async function onGenerate() {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marca, canal, tipoCaso, prioridad, mensajeCliente, contextoInterno, pedido, sku }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Error al generar respuesta.");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-shell">
      <div className="hero">
        <div>
          <span className="pill">Uso interno</span>
          <h1>Asistente Luzdeco 1</h1>
          <p>Demo funcional para atención a clientes. Pega el mensaje del cliente y genera una respuesta con apoyo de tu base en Google Sheets.</p>
        </div>
      </div>

      <div className="app-grid">
        <section className="panel form-panel">
          <h2>Captura del caso</h2>

          <div className="form-grid two-cols">
            <label>
              <span>Marca</span>
              <select value={marca} onChange={(e) => setMarca(e.target.value)}>
                {MARCAS.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label>
              <span>Canal</span>
              <select value={canal} onChange={(e) => setCanal(e.target.value)}>
                {CANALES.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
          </div>

          <div className="form-grid two-cols">
            <label>
              <span>Tipo de caso</span>
              <select value={tipoCaso} onChange={(e) => setTipoCaso(e.target.value)}>
                {TIPOS.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label>
              <span>Prioridad</span>
              <select value={prioridad} onChange={(e) => setPrioridad(e.target.value)}>
                {PRIORIDADES.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
          </div>

          <label>
            <span>Mensaje del cliente</span>
            <textarea
              rows={7}
              value={mensajeCliente}
              onChange={(e) => setMensajeCliente(e.target.value)}
              placeholder="Ej. Hola, compré el ventilador hace 3 días y ya no prende, ¿me pueden apoyar?"
            />
          </label>

          <label>
            <span>Contexto interno</span>
            <textarea
              rows={3}
              value={contextoInterno}
              onChange={(e) => setContextoInterno(e.target.value)}
              placeholder="Ej. Pedido reciente, cliente ya había escrito ayer."
            />
          </label>

          <div className="form-grid two-cols">
            <label>
              <span>Número de pedido</span>
              <input value={pedido} onChange={(e) => setPedido(e.target.value)} placeholder="MLM123456" />
            </label>
            <label>
              <span>SKU / modelo</span>
              <input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="NA1020" />
            </label>
          </div>

          <div className="actions-row">
            <button className="primary-btn" onClick={onGenerate} disabled={!canGenerate || loading}>
              {loading ? "Generando..." : "Generar respuesta"}
            </button>
            <button
              className="secondary-btn"
              onClick={() => {
                setMensajeCliente("");
                setContextoInterno("");
                setPedido("");
                setSku("");
                setResult(null);
                setError("");
              }}
            >
              Limpiar
            </button>
          </div>

          {error ? <p className="error-box">{error}</p> : null}
        </section>

        <ResultPanel result={result} />
      </div>
    </main>
  );
}
