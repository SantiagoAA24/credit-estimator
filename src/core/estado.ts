/**
 * Estado del simulador y su serialización en la URL (#s=...), para que cada simulación
 * se pueda compartir con un link sin necesidad de backend ni cuentas.
 */
import type { TipoTasa } from "./tasas";
import type { Patron } from "./patrones";

export interface EstadoSimulador {
  valorInmueble: number;
  /** Fracción financiada (0-1). */
  porcentajeFinanciado: number;
  /** Tasa en porcentaje según `tipoTasa` (ej. 12 = 12 %). */
  tasa: number;
  tipoTasa: TipoTasa;
  plazoAnios: number;
  /** Fecha de la primera cuota, "YYYY-MM". */
  inicio: string;
  /** Seguro de vida, % mensual sobre el saldo (ej. 0.05 = 0,05 %). */
  seguroVida: number;
  /** Otros costos mensuales: seguro de hogar, predial prorrateado, administración... */
  costosFijos: number;
  /** Ingreso mensual del hogar (opcional, para validar el tope del 30 %). */
  ingresoMensual: number;
  patrones: Patron[];
}

function proximoMes(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function estadoInicial(): EstadoSimulador {
  return {
    valorInmueble: 250_000_000,
    porcentajeFinanciado: 0.7,
    tasa: 12,
    tipoTasa: "EA",
    plazoAnios: 20,
    inicio: proximoMes(),
    seguroVida: 0.05,
    costosFijos: 0,
    ingresoMensual: 0,
    patrones: [
      {
        id: "primas",
        kind: "calendario",
        etiqueta: "Primas",
        mesesDelAnio: [6, 12],
        desde: 1,
        anios: 0,
        monto: 1_500_000,
        tipo: "plazo",
        crecimientoAnual: 0,
      },
    ],
  };
}

function aBase64Url(texto: string): string {
  const bytes = new TextEncoder().encode(texto);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function deBase64Url(b64: string): string {
  const bin = atob(b64.replaceAll("-", "+").replaceAll("_", "/"));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

export function serializar(e: EstadoSimulador): string {
  return aBase64Url(JSON.stringify(e));
}

/** Lee el estado de un hash tipo "#s=...". Devuelve null si no hay datos válidos. */
export function deserializar(hash: string): EstadoSimulador | null {
  const m = /[#&]s=([A-Za-z0-9_-]+)/.exec(hash);
  if (!m) return null;
  try {
    const datos = JSON.parse(deBase64Url(m[1]));
    if (typeof datos !== "object" || datos === null || Array.isArray(datos)) return null;
    const base = estadoInicial();
    return {
      ...base,
      ...datos,
      patrones: Array.isArray(datos.patrones) ? datos.patrones : base.patrones,
    };
  } catch {
    return null;
  }
}
