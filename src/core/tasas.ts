/**
 * Conversión de tasas de interés.
 *
 * - E.A.  (efectiva anual): la que publican la mayoría de bancos en Colombia.
 * - N.M.V. (nominal mes vencido): tasa anual que se divide entre 12.
 * - M.V.  (efectiva mensual / mes vencido): la que realmente se cobra cada mes.
 */

export type TipoTasa = "EA" | "NMV" | "MV";

export function eaAMensual(ea: number): number {
  return (1 + ea) ** (1 / 12) - 1;
}

export function mensualAEa(mv: number): number {
  return (1 + mv) ** 12 - 1;
}

export function nmvAMensual(nmv: number): number {
  return nmv / 12;
}

export function mensualANmv(mv: number): number {
  return mv * 12;
}

/** Convierte una tasa expresada en cualquier tipo a tasa efectiva mensual. */
export function aTasaMensual(valor: number, tipo: TipoTasa): number {
  switch (tipo) {
    case "EA":
      return eaAMensual(valor);
    case "NMV":
      return nmvAMensual(valor);
    case "MV":
      return valor;
  }
}

/** Devuelve la misma tasa expresada en los tres formatos. */
export function equivalencias(tasaMensual: number): Record<TipoTasa, number> {
  return {
    EA: mensualAEa(tasaMensual),
    NMV: mensualANmv(tasaMensual),
    MV: tasaMensual,
  };
}
