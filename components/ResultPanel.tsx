"use client";

type Props = {
  result: {
    diagnostico: string;
    checklist: string[];
    advertencias: string[];
    respuesta: string;
    fuentes?: string[];
  } | null;
};

export function ResultPanel({ result }: Props) {
  const copy = async () => {
    if (!result?.respuesta) return;
    await navigator.clipboard.writeText(result.respuesta);
    alert("Respuesta copiada");
  };

  if (!result) {
    return (
      <section className="panel empty-panel">
        <h2>Resultado</h2>
        <p>Aquí verás el diagnóstico, checklist, advertencias y la respuesta sugerida.</p>
      </section>
    );
  }

  return (
    <section className="panel result-panel">
      <div className="result-head">
        <div>
          <p className="eyebrow">Diagnóstico</p>
          <h2>{result.diagnostico}</h2>
        </div>
        <button className="secondary-btn" onClick={copy}>Copiar respuesta</button>
      </div>

      <div className="grid-two">
        <div className="card">
          <p className="eyebrow">Checklist</p>
          <ul>
            {result.checklist.length ? result.checklist.map((item) => <li key={item}>{item}</li>) : <li>No hay checklist sugerido.</li>}
          </ul>
        </div>
        <div className="card">
          <p className="eyebrow">Advertencias</p>
          <ul>
            {result.advertencias.length ? result.advertencias.map((item) => <li key={item}>{item}</li>) : <li>Sin advertencias específicas.</li>}
          </ul>
        </div>
      </div>

      <div className="card response-box">
        <p className="eyebrow">Respuesta sugerida</p>
        <textarea value={result.respuesta} readOnly rows={8} />
      </div>

      <div className="card">
        <p className="eyebrow">Fuentes utilizadas</p>
        <ul>
          {result.fuentes?.length ? result.fuentes.map((item) => <li key={item}>{item}</li>) : <li>Sin fuentes listadas.</li>}
        </ul>
      </div>
    </section>
  );
}
