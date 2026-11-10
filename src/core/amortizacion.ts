/**
 * Motor de amortización — sistema francés (cuota fija) con abonos a capital.
 *
 * Portado desde notebooks/credito_hipotecario.ipynb (`CuotaMensual`, `calc_table`)
 * con estas correcciones:
 *  - La última cuota se ajusta al saldo pendiente (el saldo nunca queda negativo).
 *  - Un abono nunca supera el saldo pendiente.
 *  - "Pagado acumulado" se calcula con lo realmente pagado, no restando del total original.
 *  - El seguro de vida se calcula cada mes sobre el saldo, no sobre el monto inicial.
 */

export type TipoAbono = "plazo" | "cuota";

export interface Abono {
  /** Mes del crédito (1 = primera cuota) en el que se hace el abono, después de pagar la cuota. */
  mes: number;
  monto: number;
  /** "plazo": mantiene la cuota y acorta el plazo. "cuota": mantiene el plazo y baja la cuota. */
  tipo: TipoAbono;
}

export interface ParamsCredito {
  /** Monto financiado. */
  monto: number;
  /** Tasa efectiva mensual (fracción, ej. 0.0049). */
  tasaMensual: number;
  /** Número de cuotas pactadas. */
  plazoMeses: number;
  /** Seguro de vida: fracción mensual sobre el saldo (ej. 0.0005 = 0,05 % mensual). */
  seguroVidaMensual?: number;
  /** Costos fijos mensuales adicionales (seguro de hogar, predial prorrateado, etc.). */
  costosFijosMensuales?: number;
}

export interface FilaAmortizacion {
  mes: number;
  saldoInicial: number;
  /** Cuota del crédito (interés + capital), sin seguros ni abonos. */
  cuota: number;
  interes: number;
  capital: number;
  abono: number;
  saldoFinal: number;
  seguroVida: number;
  costosFijos: number;
  /** Todo lo que salió del bolsillo este mes: cuota + abono + seguros + costos. */
  pagoTotalMes: number;
  /** Suma acumulada de `pagoTotalMes`. */
  pagadoAcumulado: number;
}

export interface ResultadoSimulacion {
  filas: FilaAmortizacion[];
  cuotaInicial: number;
  cuotaFinal: number;
  meses: number;
  totalIntereses: number;
  totalAbonos: number;
  totalSeguroVida: number;
  totalCostosFijos: number;
  /** Cuotas + abonos (lo pagado al banco por el crédito, sin seguros). */
  totalPagadoCredito: number;
  /** Todo lo pagado, incluyendo seguros y costos fijos. */
  totalPagado: number;
}

const EPS = 0.005; // medio centavo

/** Cuota fija del sistema francés: C = P · i(1+i)^n / ((1+i)^n − 1). */
export function cuotaFija(monto: number, tasaMensual: number, n: number): number {
  if (n <= 0 || monto <= 0) return 0;
  if (tasaMensual === 0) return monto / n;
  const f = (1 + tasaMensual) ** n;
  return (monto * tasaMensual * f) / (f - 1);
}

/** Agrupa abonos del mismo mes (suma montos; si hay tipos distintos gana el último, como en el cuaderno). */
export function agruparAbonos(abonos: Abono[]): Map<number, { monto: number; tipo: TipoAbono }> {
  const mapa = new Map<number, { monto: number; tipo: TipoAbono }>();
  for (const a of abonos) {
    const mes = Math.trunc(a.mes);
    if (!(a.monto > 0) || mes < 1) continue;
    const previo = mapa.get(mes);
    if (previo) {
      previo.monto += a.monto;
      previo.tipo = a.tipo;
    } else {
      mapa.set(mes, { monto: a.monto, tipo: a.tipo });
    }
  }
  return mapa;
}

export function simular(params: ParamsCredito, abonos: Abono[] = []): ResultadoSimulacion {
  const { monto, tasaMensual: i, plazoMeses: n } = params;
  const tasaSeguro = params.seguroVidaMensual ?? 0;
  const costosFijos = params.costosFijosMensuales ?? 0;
  const mapaAbonos = agruparAbonos(abonos);

  const cuotaInicial = cuotaFija(monto, i, n);
  let cuota = cuotaInicial;
  let saldo = monto;
  let pagadoAcumulado = 0;

  const filas: FilaAmortizacion[] = [];

  for (let mes = 1; mes <= n && saldo > EPS; mes++) {
    const saldoInicial = saldo;
    const interes = saldo * i;
    const seguroVida = saldo * tasaSeguro;

    // Capital ordinario; en el último mes (o si sobra) se limita al saldo pendiente.
    let capital = Math.min(cuota - interes, saldo);
    if (mes === n) capital = saldo; // liquidar residuos de redondeo
    capital = Math.max(capital, 0);
    const cuotaMes = interes + capital;
    saldo -= capital;

    const infoAbono = mapaAbonos.get(mes);
    const abono = infoAbono ? Math.min(infoAbono.monto, saldo) : 0;
    saldo -= abono;
    if (saldo < EPS) saldo = 0;

    pagadoAcumulado += cuotaMes + abono + seguroVida + costosFijos;

    filas.push({
      mes,
      saldoInicial,
      cuota: cuotaMes,
      interes,
      capital,
      abono,
      saldoFinal: saldo,
      seguroVida,
      costosFijos,
      pagoTotalMes: cuotaMes + abono + seguroVida + costosFijos,
      pagadoAcumulado,
    });

    // Reducción de cuota: se recalcula la cuota sobre el nuevo saldo para los meses que faltan.
    if (abono > 0 && infoAbono?.tipo === "cuota" && saldo > 0) {
      cuota = cuotaFija(saldo, i, n - mes);
    }
  }

  const suma = (k: keyof FilaAmortizacion) => filas.reduce((acc, f) => acc + f[k], 0);
  const totalIntereses = suma("interes");
  const totalAbonos = suma("abono");
  const totalSeguroVida = suma("seguroVida");
  const totalCostosFijos = suma("costosFijos");
  const totalPagadoCredito = suma("cuota") + totalAbonos;

  return {
    filas,
    cuotaInicial,
    cuotaFinal: filas.length ? filas[filas.length - 1].cuota : 0,
    meses: filas.length,
    totalIntereses,
    totalAbonos,
    totalSeguroVida,
    totalCostosFijos,
    totalPagadoCredito,
    totalPagado: totalPagadoCredito + totalSeguroVida + totalCostosFijos,
  };
}

export interface Comparacion {
  ahorroIntereses: number;
  /** Ahorro en intereses / % de los intereses sin abonos. */
  ahorroPorcentaje: number;
  mesesMenos: number;
  /** Pesos de interés ahorrados por cada peso abonado. */
  ahorroPorPesoAbonado: number;
}

export function comparar(base: ResultadoSimulacion, conAbonos: ResultadoSimulacion): Comparacion {
  const ahorroIntereses = base.totalIntereses - conAbonos.totalIntereses;
  return {
    ahorroIntereses,
    ahorroPorcentaje: base.totalIntereses > 0 ? ahorroIntereses / base.totalIntereses : 0,
    mesesMenos: base.meses - conAbonos.meses,
    ahorroPorPesoAbonado: conAbonos.totalAbonos > 0 ? ahorroIntereses / conAbonos.totalAbonos : 0,
  };
}

/**
 * Capacidad de endeudamiento: en Colombia la primera cuota de un crédito de vivienda
 * no debe superar el 30 % de los ingresos familiares (Ley 546 de 1999).
 */
export function montoMaximoPorIngresos(
  ingresoMensual: number,
  tasaMensual: number,
  plazoMeses: number,
  porcentajeMaximo = 0.3,
): { cuotaMaxima: number; montoMaximo: number } {
  const cuotaMaxima = ingresoMensual * porcentajeMaximo;
  const cuotaPorPeso = cuotaFija(1, tasaMensual, plazoMeses);
  return { cuotaMaxima, montoMaximo: cuotaPorPeso > 0 ? cuotaMaxima / cuotaPorPeso : 0 };
}
