export type GenerateInput = {
  marca: string;
  canal: string;
  tipoCaso: string;
  prioridad: string;
  mensajeCliente: string;
  contextoInterno?: string;
  pedido?: string;
  sku?: string;
};

export type GenerateOutput = {
  diagnostico: string;
  checklist: string[];
  advertencias: string[];
  respuesta: string;
  fuentes: string[];
};

export type Row = Record<string, string>;
