import { useMemo, useState } from "react";
import type { ResultadoSimulacion } from "../core/amortizacion";
import { formatoCompacto, formatoPesos } from "../core/formato";
import { etiquetaFecha, fechaDeMes } from "../core/patrones";
import { Segmentado } from "./Campos";
import { EChart, useModoOscuro } from "./EChart";

export const COLORES = {
  claro: { interes: "#e5484d", capital: "#12a594", abono: "#f5a524", base: "#8b8d98", plazo: "#3e63dd", cuota: "#f5a524" },
  oscuro: { interes: "#ff6369", capital: "#0bd8b6", abono: "#ffca16", base: "#9a9ca8", plazo: "#849dff", cuota: "#ffca16" },
};

export function usePaleta() {
  return useModoOscuro() ? COLORES.oscuro : COLORES.claro;
}

function ejes(oscuro: boolean) {
  const texto = oscuro ? "#a1a1aa" : "#52525b";
  const linea = oscuro ? "#27272a" : "#e4e4e7";
  return {
    texto,
    eje: { axisLabel: { color: texto }, axisLine: { lineStyle: { color: linea } }, splitLine: { lineStyle: { color: linea } } },
    tooltip: {
      trigger: "axis" as const,
      backgroundColor: oscuro ? "#18181b" : "#ffffff",
      borderColor: linea,
      textStyle: { color: oscuro ? "#f4f4f5" : "#18181b" },
    },
  };
}

type Agrupacion = "mes" | "anio";

/** Barras apiladas: interés + capital + abono por mes o por año. */
export function GraficaAmortizacion({ resultado, inicio }: { resultado: ResultadoSimulacion; inicio: string }) {
  const oscuro = useModoOscuro();
  const p = oscuro ? COLORES.oscuro : COLORES.claro;
  const [agrupacion, setAgrupacion] = useState<Agrupacion>(resultado.meses > 120 ? "anio" : "mes");

  const option = useMemo(() => {
    const e = ejes(oscuro);
    let categorias: string[];
    let interes: number[];
    let capital: number[];
    let abono: number[];

    if (agrupacion === "mes") {
      categorias = resultado.filas.map((f) => `${f.mes} · ${etiquetaFecha(inicio, f.mes)}`);
      interes = resultado.filas.map((f) => f.interes);
      capital = resultado.filas.map((f) => f.capital);
      abono = resultado.filas.map((f) => f.abono);
    } else {
      const porAnio = new Map<number, { i: number; c: number; a: number }>();
      for (const f of resultado.filas) {
        const { anio } = fechaDeMes(inicio, f.mes);
        const acc = porAnio.get(anio) ?? { i: 0, c: 0, a: 0 };
        acc.i += f.interes;
        acc.c += f.capital;
        acc.a += f.abono;
        porAnio.set(anio, acc);
      }
      categorias = [...porAnio.keys()].map(String);
      interes = [...porAnio.values()].map((v) => v.i);
      capital = [...porAnio.values()].map((v) => v.c);
      abono = [...porAnio.values()].map((v) => v.a);
    }

    const hayAbonos = abono.some((v) => v > 0);
    const serie = (name: string, data: number[], color: string) => ({
      name,
      type: "bar",
      stack: "total",
      data,
      itemStyle: { color },
      barCategoryGap: agrupacion === "mes" ? "20%" : "30%",
      emphasis: { focus: "series" },
    });

    return {
      animationDuration: 300,
      grid: { left: 8, right: 8, top: 40, bottom: agrupacion === "mes" ? 56 : 24, containLabel: true },
      legend: { top: 0, textStyle: { color: e.texto } },
      tooltip: {
        ...e.tooltip,
        axisPointer: { type: "shadow" },
        valueFormatter: (v: number) => formatoPesos(v),
      },
      xAxis: { type: "category", data: categorias, ...e.eje, splitLine: { show: false } },
      yAxis: { type: "value", ...e.eje, axisLabel: { ...e.eje.axisLabel, formatter: (v: number) => formatoCompacto(v) } },
      dataZoom: agrupacion === "mes" ? [{ type: "inside" }, { type: "slider", height: 18, bottom: 8 }] : [],
      series: [
        serie("Intereses", interes, p.interes),
        serie("Capital", capital, p.capital),
        ...(hayAbonos ? [serie("Abonos", abono, p.abono)] : []),
      ],
    };
  }, [resultado, inicio, agrupacion, oscuro, p]);

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">¿A dónde va cada pago?</h3>
        <Segmentado
          etiqueta="Agrupar por"
          valor={agrupacion}
          onChange={setAgrupacion}
          opciones={[
            { valor: "mes", texto: "Por mes" },
            { valor: "anio", texto: "Por año" },
          ]}
        />
      </div>
      <EChart option={option} etiqueta="Gráfica de amortización: intereses, capital y abonos" />
    </div>
  );
}

export interface Escenario {
  nombre: string;
  color: string;
  resultado: ResultadoSimulacion;
  punteada?: boolean;
}

/** Líneas del saldo pendiente para varios escenarios. */
export function GraficaSaldo({ escenarios, monto, inicio }: { escenarios: Escenario[]; monto: number; inicio: string }) {
  const oscuro = useModoOscuro();

  const option = useMemo(() => {
    const e = ejes(oscuro);
    const maxMeses = Math.max(...escenarios.map((s) => s.resultado.meses));
    const categorias = Array.from({ length: maxMeses + 1 }, (_, k) => (k === 0 ? "Inicio" : `${k} · ${etiquetaFecha(inicio, k)}`));
    return {
      animationDuration: 300,
      grid: { left: 8, right: 28, top: 40, bottom: 24, containLabel: true },
      legend: { top: 0, textStyle: { color: e.texto } },
      tooltip: { ...e.tooltip, valueFormatter: (v: number) => (v == null ? "—" : formatoPesos(v)) },
      xAxis: {
        type: "category",
        data: categorias,
        boundaryGap: false,
        ...e.eje,
        splitLine: { show: false },
        axisLabel: { ...e.eje.axisLabel, formatter: (v: string) => v.split(" · ")[1] ?? v },
      },
      yAxis: { type: "value", ...e.eje, axisLabel: { ...e.eje.axisLabel, formatter: (v: number) => formatoCompacto(v) } },
      series: escenarios.map((s) => ({
        name: s.nombre,
        type: "line",
        showSymbol: false,
        data: [monto, ...s.resultado.filas.map((f) => f.saldoFinal)],
        lineStyle: { color: s.color, width: 2.5, type: s.punteada ? "dashed" : "solid" },
        itemStyle: { color: s.color },
      })),
    };
  }, [escenarios, monto, inicio, oscuro]);

  return <EChart option={option} alto={320} etiqueta="Saldo pendiente del crédito en cada escenario" />;
}
