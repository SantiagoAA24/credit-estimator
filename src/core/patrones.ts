/**
 * Patrones de abonos a capital. Un patrón se expande a una lista de abonos concretos
 * (`Abono[]`) que consume el motor de amortización.
 */
import type { Abono, TipoAbono } from "./amortizacion";

interface PatronBase {
  id: string;
  tipo: TipoAbono;
  monto: number;
  /** Crecimiento anual del monto (fracción), ej. 0.05 = el abono sube 5 % cada año. */
  crecimientoAnual: number;
}

/** Un solo abono en un mes específico. */
export interface PatronUnico extends PatronBase {
  kind: "unico";
  mes: number;
}

/** Un abono cada `cada` meses, empezando en `desde`, `veces` veces (0 = hasta terminar). */
export interface PatronPeriodico extends PatronBase {
  kind: "periodico";
  desde: number;
  cada: number;
  veces: number;
}

/**
 * Abonos atados a meses del calendario: primas (junio y diciembre), cesantías (febrero), etc.
 * Requiere conocer la fecha de la primera cuota.
 */
export interface PatronCalendario extends PatronBase {
  kind: "calendario";
  /** Meses del año (1-12) en los que se abona. */
  mesesDelAnio: number[];
  /** Primer mes del crédito desde el cual aplicar (1 = desde el inicio). */
  desde: number;
  /** Número de años (0 = hasta terminar el crédito). */
  anios: number;
  etiqueta?: string;
}

export type Patron = PatronUnico | PatronPeriodico | PatronCalendario;

/** Fecha de la primera cuota en formato "YYYY-MM". */
export type MesCalendario = string;

export function parseMesCalendario(ym: MesCalendario): { anio: number; mes: number } {
  const [a, m] = ym.split("-").map(Number);
  return { anio: a || 2026, mes: m >= 1 && m <= 12 ? m : 1 };
}

/** Mes del año (1-12) correspondiente al mes `k` del crédito (1 = primera cuota). */
export function mesDelAnio(inicio: MesCalendario, k: number): number {
  const { mes } = parseMesCalendario(inicio);
  return ((mes - 1 + (k - 1)) % 12) + 1;
}

/** Fecha "YYYY-MM" del mes `k` del crédito. */
export function fechaDeMes(inicio: MesCalendario, k: number): { anio: number; mes: number } {
  const { anio, mes } = parseMesCalendario(inicio);
  const total = mes - 1 + (k - 1);
  return { anio: anio + Math.floor(total / 12), mes: (total % 12) + 1 };
}

const NOMBRES_MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export function etiquetaFecha(inicio: MesCalendario, k: number): string {
  const { anio, mes } = fechaDeMes(inicio, k);
  return `${NOMBRES_MES[mes - 1]} ${anio}`;
}

function montoConCrecimiento(p: PatronBase, mesInicioPatron: number, mes: number): number {
  const aniosTranscurridos = Math.floor((mes - mesInicioPatron) / 12);
  return p.monto * (1 + p.crecimientoAnual) ** Math.max(aniosTranscurridos, 0);
}

export function expandirPatron(p: Patron, plazoMeses: number, inicio: MesCalendario): Abono[] {
  if (!(p.monto > 0)) return [];
  const abonos: Abono[] = [];

  switch (p.kind) {
    case "unico":
      if (p.mes >= 1 && p.mes <= plazoMeses) abonos.push({ mes: p.mes, monto: p.monto, tipo: p.tipo });
      break;

    case "periodico": {
      const cada = Math.max(1, Math.trunc(p.cada));
      const desde = Math.max(1, Math.trunc(p.desde));
      const max = p.veces > 0 ? p.veces : Infinity;
      for (let k = 0, mes = desde; k < max && mes <= plazoMeses; k++, mes += cada) {
        abonos.push({ mes, monto: montoConCrecimiento(p, desde, mes), tipo: p.tipo });
      }
      break;
    }

    case "calendario": {
      const desde = Math.max(1, Math.trunc(p.desde));
      const hasta = p.anios > 0 ? Math.min(plazoMeses, desde + p.anios * 12 - 1) : plazoMeses;
      const meses = new Set(p.mesesDelAnio);
      for (let mes = desde; mes <= hasta; mes++) {
        if (meses.has(mesDelAnio(inicio, mes))) {
          abonos.push({ mes, monto: montoConCrecimiento(p, desde, mes), tipo: p.tipo });
        }
      }
      break;
    }
  }
  return abonos;
}

export function expandirPatrones(patrones: Patron[], plazoMeses: number, inicio: MesCalendario): Abono[] {
  return patrones.flatMap((p) => expandirPatron(p, plazoMeses, inicio)).sort((a, b) => a.mes - b.mes);
}

/** Fuerza un tipo de abono en todos los abonos (para comparar "todo a plazo" vs "todo a cuota"). */
export function conTipo(abonos: Abono[], tipo: TipoAbono): Abono[] {
  return abonos.map((a) => ({ ...a, tipo }));
}
