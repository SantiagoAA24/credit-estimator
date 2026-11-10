import type { ResultadoSimulacion } from "../core/amortizacion";
import { formatoPesos } from "../core/formato";
import { etiquetaFecha } from "../core/patrones";

function descargarCsv(resultado: ResultadoSimulacion, inicio: string) {
  const encabezado = ["Mes", "Fecha", "Saldo inicial", "Cuota", "Interés", "Capital", "Abono", "Saldo final", "Seguro de vida", "Otros costos", "Pago total del mes"];
  const filas = resultado.filas.map((f) =>
    [f.mes, etiquetaFecha(inicio, f.mes), f.saldoInicial, f.cuota, f.interes, f.capital, f.abono, f.saldoFinal, f.seguroVida, f.costosFijos, f.pagoTotalMes]
      .map((v) => (typeof v === "number" ? v.toFixed(2) : v))
      .join(";"),
  );
  // ";" como separador y BOM para que Excel en español lo abra bien.
  const csv = "﻿" + [encabezado.join(";"), ...filas].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "tabla-amortizacion.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function TablaAmortizacion({ resultado, inicio }: { resultado: ResultadoSimulacion; inicio: string }) {
  const haySeguro = resultado.totalSeguroVida > 0;
  return (
    <details className="tarjeta group">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2">
        <span className="font-semibold">
          Tabla de amortización <span className="font-normal text-slate-500">({resultado.meses} cuotas)</span>
        </span>
        <span className="text-sm text-marca-600 group-open:hidden">Ver tabla ▾</span>
        <span className="hidden text-sm text-marca-600 group-open:inline">Ocultar ▴</span>
      </summary>
      <div className="mt-3 flex justify-end">
        <button type="button" className="boton" onClick={() => descargarCsv(resultado, inicio)}>
          Descargar CSV
        </button>
      </div>
      <div className="mt-3 max-h-[480px] overflow-auto rounded-lg border border-slate-200 dark:border-slate-800">
        <table className="w-full min-w-[640px] text-right text-sm tabular-nums">
          <thead className="sticky top-0 bg-slate-100 text-xs uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <tr>
              <th className="px-3 py-2 text-left">Mes</th>
              <th className="px-3 py-2">Cuota</th>
              <th className="px-3 py-2">Interés</th>
              <th className="px-3 py-2">Capital</th>
              <th className="px-3 py-2">Abono</th>
              {haySeguro && <th className="px-3 py-2">Seguro vida</th>}
              <th className="px-3 py-2">Saldo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {resultado.filas.map((f) => (
              <tr key={f.mes} className={f.abono > 0 ? "bg-amber-50 dark:bg-amber-950/30" : undefined}>
                <td className="px-3 py-1.5 text-left">
                  {f.mes} <span className="text-slate-400">· {etiquetaFecha(inicio, f.mes)}</span>
                </td>
                <td className="px-3 py-1.5">{formatoPesos(f.cuota)}</td>
                <td className="px-3 py-1.5">{formatoPesos(f.interes)}</td>
                <td className="px-3 py-1.5">{formatoPesos(f.capital)}</td>
                <td className="px-3 py-1.5">{f.abono > 0 ? formatoPesos(f.abono) : "—"}</td>
                {haySeguro && <td className="px-3 py-1.5">{formatoPesos(f.seguroVida)}</td>}
                <td className="px-3 py-1.5">{formatoPesos(f.saldoFinal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
