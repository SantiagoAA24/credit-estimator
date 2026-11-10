import { describe, expect, it } from "vitest";
import { comparar, cuotaFija, montoMaximoPorIngresos, simular } from "./amortizacion";
import { eaAMensual, mensualAEa, nmvAMensual } from "./tasas";
import { expandirPatron, expandirPatrones, mesDelAnio, type Patron } from "./patrones";

const M = 1_000_000;

/**
 * Valores de referencia tomados de notebooks/credito_hipotecario.ipynb
 * (celda con 400M al 6 % E.A., tabla de plazos).
 */
describe("paridad con el cuaderno: cuota fija", () => {
  const i = eaAMensual(0.06);
  const casos: [number, number, number][] = [
    // [años, cuota, total a pagar]
    [5, 7_703_593, 462_215_593],
    [10, 4_408_961, 529_075_325],
    [15, 3_341_176, 601_411_752],
    [20, 2_829_168, 679_000_383],
    [30, 2_357_482, 848_693_400],
  ];
  it.each(casos)("%i años", (anios, cuota, total) => {
    const n = anios * 12;
    expect(Math.round(cuotaFija(400 * M, i, n))).toBe(cuota);
    expect(Math.round(simular({ monto: 400 * M, tasaMensual: i, plazoMeses: n }).totalPagadoCredito)).toBe(total);
  });

  it("tasa mensual equivalente a 6 % E.A. = 0,4868 %", () => {
    expect(i * 100).toBeCloseTo(0.4868, 4);
  });
});

/**
 * Referencia: calc_table(48M, InteresMensual(0.32), 60, abonos) del cuaderno original,
 * ejecutado en Python.
 */
describe("paridad con el cuaderno: abonos a capital (48M, 32 % E.A., 60 meses)", () => {
  const params = { monto: 48 * M, tasaMensual: eaAMensual(0.32), plazoMeses: 60 };

  it("sin abonos", () => {
    const r = simular(params);
    expect(r.meses).toBe(60);
    expect(r.totalIntereses).toBeCloseTo(41_822_085.56, 1);
    expect(r.cuotaInicial).toBeCloseTo(1_497_034.76, 1);
    expect(r.filas.at(-1)!.saldoFinal).toBe(0);
  });

  it("abono de 15M en el mes 12 reduciendo plazo", () => {
    const r = simular(params, [{ mes: 12, monto: 15 * M, tipo: "plazo" }]);
    expect(r.meses).toBe(37);
    expect(r.totalIntereses).toBeCloseTo(22_035_509.61, 1);
    // Corrección frente al cuaderno: allí el saldo final quedaba en -354.776,49
    // porque se cobraba la cuota completa en el último mes.
    expect(r.filas.at(-1)!.saldoFinal).toBe(0);
    expect(r.cuotaFinal).toBeCloseTo(1_497_034.76 - 354_776.49, 1);
  });

  it("abono de 15M en el mes 12 reduciendo cuota", () => {
    const r = simular(params, [{ mes: 12, monto: 15 * M, tipo: "cuota" }]);
    expect(r.meses).toBe(60);
    expect(r.totalIntereses).toBeCloseTo(31_692_754.89, 1);
    expect(r.filas[13].cuota).toBeCloseTo(973_507.04, 1);
    expect(r.filas.at(-1)!.saldoFinal).toBe(0);
  });

  it("reducir plazo ahorra más intereses que reducir cuota", () => {
    const base = simular(params);
    const plazo = comparar(base, simular(params, [{ mes: 12, monto: 15 * M, tipo: "plazo" }]));
    const cuota = comparar(base, simular(params, [{ mes: 12, monto: 15 * M, tipo: "cuota" }]));
    expect(plazo.ahorroIntereses).toBeGreaterThan(cuota.ahorroIntereses);
    expect(plazo.mesesMenos).toBe(23);
    expect(cuota.mesesMenos).toBe(0);
  });
});

describe("casos borde", () => {
  const params = { monto: 10 * M, tasaMensual: 0.01, plazoMeses: 12 };

  it("un abono mayor al saldo liquida el crédito sin saldo negativo", () => {
    const r = simular(params, [{ mes: 3, monto: 50 * M, tipo: "plazo" }]);
    expect(r.meses).toBe(3);
    expect(r.filas[2].saldoFinal).toBe(0);
    const capitalPagado = r.filas.reduce((a, f) => a + f.capital + f.abono, 0);
    expect(capitalPagado).toBeCloseTo(10 * M, 2);
  });

  it("tasa cero reparte el capital en partes iguales", () => {
    const r = simular({ ...params, tasaMensual: 0 });
    expect(r.cuotaInicial).toBeCloseTo(10 * M / 12, 6);
    expect(r.totalIntereses).toBe(0);
  });

  it("abonos del mismo mes se suman", () => {
    const a = simular(params, [
      { mes: 2, monto: 1 * M, tipo: "plazo" },
      { mes: 2, monto: 2 * M, tipo: "plazo" },
    ]);
    const b = simular(params, [{ mes: 2, monto: 3 * M, tipo: "plazo" }]);
    expect(a.totalIntereses).toBeCloseTo(b.totalIntereses, 6);
  });

  it("seguro de vida se calcula sobre el saldo", () => {
    const r = simular({ ...params, seguroVidaMensual: 0.001 });
    expect(r.filas[0].seguroVida).toBeCloseTo(10_000, 6);
    expect(r.filas[11].seguroVida).toBeLessThan(r.filas[0].seguroVida);
  });

  it("el capital amortizado suma el monto financiado", () => {
    const r = simular(params, [{ mes: 5, monto: 2 * M, tipo: "cuota" }]);
    const capital = r.filas.reduce((a, f) => a + f.capital + f.abono, 0);
    expect(capital).toBeCloseTo(10 * M, 2);
  });
});

describe("tasas", () => {
  it("E.A. ↔ mensual ida y vuelta", () => {
    expect(mensualAEa(eaAMensual(0.12))).toBeCloseTo(0.12, 12);
  });
  it("N.M.V. 12 % = 1 % mensual", () => {
    expect(nmvAMensual(0.12)).toBeCloseTo(0.01, 12);
  });
});

describe("capacidad por ingresos", () => {
  it("cuota máxima = 30 % del ingreso (ejemplo del cuaderno)", () => {
    const r = montoMaximoPorIngresos(5.5 * M, eaAMensual(0.12), 240);
    expect(r.cuotaMaxima).toBeCloseTo(1_650_000, 6);
    expect(cuotaFija(r.montoMaximo, eaAMensual(0.12), 240)).toBeCloseTo(1_650_000, 4);
  });
});

describe("patrones de abono", () => {
  const base = { id: "x", tipo: "plazo" as const, monto: 1 * M, crecimientoAnual: 0 };

  it("periódico: equivalente a calc_abonos(12, monto, 3) del cuaderno", () => {
    const p: Patron = { ...base, kind: "periodico", desde: 12, cada: 12, veces: 3 };
    expect(expandirPatron(p, 60, "2026-01").map((a) => a.mes)).toEqual([12, 24, 36]);
  });

  it("periódico sin límite se detiene en el plazo", () => {
    const p: Patron = { ...base, kind: "periodico", desde: 1, cada: 6, veces: 0 };
    expect(expandirPatron(p, 24, "2026-01").map((a) => a.mes)).toEqual([1, 7, 13, 19]);
  });

  it("primas (jun y dic) con primera cuota en marzo", () => {
    expect(mesDelAnio("2026-03", 1)).toBe(3);
    const p: Patron = { ...base, kind: "calendario", mesesDelAnio: [6, 12], desde: 1, anios: 1 };
    // mar=1, abr=2, may=3, jun=4, ..., dic=10
    expect(expandirPatron(p, 120, "2026-03").map((a) => a.mes)).toEqual([4, 10]);
  });

  it("crecimiento anual del abono", () => {
    const p: Patron = { ...base, kind: "periodico", desde: 1, cada: 12, veces: 3, crecimientoAnual: 0.1 };
    const montos = expandirPatron(p, 60, "2026-01").map((a) => Math.round(a.monto));
    expect(montos).toEqual([1_000_000, 1_100_000, 1_210_000]);
  });

  it("varios patrones se ordenan por mes", () => {
    const abonos = expandirPatrones(
      [
        { ...base, kind: "unico", mes: 20 },
        { ...base, kind: "unico", mes: 5 },
      ],
      60,
      "2026-01",
    );
    expect(abonos.map((a) => a.mes)).toEqual([5, 20]);
  });
});
