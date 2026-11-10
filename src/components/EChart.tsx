import { useEffect, useRef, useState } from "react";
import * as echarts from "echarts/core";
import { BarChart, LineChart } from "echarts/charts";
import { DataZoomComponent, GridComponent, LegendComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { EChartsCoreOption } from "echarts/core";

echarts.use([BarChart, LineChart, GridComponent, TooltipComponent, LegendComponent, DataZoomComponent, CanvasRenderer]);

export function useModoOscuro(): boolean {
  const [oscuro, setOscuro] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const f = () => setOscuro(mq.matches);
    mq.addEventListener("change", f);
    return () => mq.removeEventListener("change", f);
  }, []);
  return oscuro;
}

export function EChart({ option, alto = 360, etiqueta }: { option: EChartsCoreOption; alto?: number; etiqueta: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const chart = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const c = echarts.init(ref.current, undefined, { renderer: "canvas" });
    chart.current = c;
    const ro = new ResizeObserver(() => c.resize());
    ro.observe(ref.current);
    return () => {
      ro.disconnect();
      c.dispose();
      chart.current = null;
    };
  }, []);

  useEffect(() => {
    chart.current?.setOption(option, { notMerge: true });
  }, [option]);

  return <div ref={ref} role="img" aria-label={etiqueta} style={{ height: alto, width: "100%" }} />;
}
