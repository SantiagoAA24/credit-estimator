const pesos = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
const pesosCompactos = new Intl.NumberFormat("es-CO", { notation: "compact", maximumFractionDigits: 1 });
const entero = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });

export const formatoPesos = (v: number) => pesos.format(Math.round(v) || 0);
export const formatoCompacto = (v: number) => `$${pesosCompactos.format(v)}`;
export const formatoEntero = (v: number) => entero.format(v);

export function formatoPorcentaje(v: number, decimales = 2): string {
  return `${(v * 100).toLocaleString("es-CO", { minimumFractionDigits: 0, maximumFractionDigits: decimales })} %`;
}

export function formatoDuracion(meses: number): string {
  const a = Math.floor(meses / 12);
  const m = meses % 12;
  const partes: string[] = [];
  if (a) partes.push(`${a} ${a === 1 ? "año" : "años"}`);
  if (m || !a) partes.push(`${m} ${m === 1 ? "mes" : "meses"}`);
  return partes.join(" y ");
}
