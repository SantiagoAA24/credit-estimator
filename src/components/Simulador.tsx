import { useEffect, useMemo, useState, type ReactNode } from "react";
import { comparar, montoMaximoPorIngresos, simular, type ResultadoSimulacion } from "../core/amortizacion";
import { deserializar, estadoInicial, serializar, type EstadoSimulador } from "../core/estado";
import { formatoDuracion, formatoPesos, formatoPorcentaje } from "../core/formato";
import { conTipo, etiquetaFecha, expandirPatrones } from "../core/patrones";
import { aTasaMensual, equivalencias, type TipoTasa } from "../core/tasas";
import { CampoDinero, CampoNumero, Segmentado } from "./Campos";
import { EditorAbonos } from "./EditorAbonos";
import { GraficaAmortizacion, GraficaSaldo, usePaleta, type Escenario } from "./Graficas";
import { TablaAmortizacion } from "./TablaAmortizacion";

const OPCIONES_TASA: { valor: TipoTasa; texto: string; titulo: string }[] = [
  { valor: "EA", texto: "E.A.", titulo: "Efectiva anual" },
  { valor: "NMV", texto: "N.M.V.", titulo: "Nominal mes vencido" },
  { valor: "MV", texto: "M.V.", titulo: "Efectiva mensual" },
];

function Seccion({ titulo, children, accion }: { titulo: string; children: ReactNode; accion?: ReactNode }) {
  return (
    <section className="tarjeta">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{titulo}</h2>
        {accion}
      </div>
      {children}
    </section>
  );
}

function Indicador({ titulo, valor, detalle, destacado }: { titulo: string; valor: string; detalle?: ReactNode; destacado?: boolean }) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        destacado
          ? "border-marca-500/40 bg-marca-50 dark:border-marca-500/40 dark:bg-marca-700/20"
          : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
      }`}
    >
      <p className="text-sm text-slate-600 dark:text-slate-400">{titulo}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${destacado ? "text-marca-700 dark:text-marca-100" : ""}`}>{valor}</p>
      {detalle && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{detalle}</p>}
    </div>
  );
}

export default function Simulador() {
  const [estado, setEstado] = useState<EstadoSimulador>(() => {
    if (typeof window === "undefined") return estadoInicial();
    return deserializar(window.location.hash) ?? estadoInicial();
  });
  const [copiado, setCopiado] = useState(false);
  const paleta = usePaleta();

  const set = <K extends keyof EstadoSimulador>(k: K, v: EstadoSimulador[K]) => setEstado((e) => ({ ...e, [k]: v }));

  // Mantener la URL sincronizada para poder compartir la simulación.
  useEffect(() => {
    const t = setTimeout(() => {
      history.replaceState(null, "", `#s=${serializar(estado)}`);
    }, 300);
    return () => clearTimeout(t);
  }, [estado]);

  const monto = Math.round(estado.valorInmueble * estado.porcentajeFinanciado);
  const plazoMeses = Math.max(1, Math.round(estado.plazoAnios * 12));
  const tasaMensual = aTasaMensual(estado.tasa / 100, estado.tipoTasa);
  const eq = equivalencias(tasaMensual);

  const calculo = useMemo(() => {
    const params = {
      monto,
      tasaMensual,
      plazoMeses,
      seguroVidaMensual: estado.seguroVida / 100,
      costosFijosMensuales: estado.costosFijos,
    };
    const abonos = expandirPatrones(estado.patrones, plazoMeses, estado.inicio);
    const base = simular(params);
    const plan = simular(params, abonos);
    const tipos = new Set(abonos.map((a) => a.tipo));
    const todoPlazo = tipos.size === 1 && tipos.has("plazo") ? plan : simular(params, conTipo(abonos, "plazo"));
    const todoCuota = tipos.size === 1 && tipos.has("cuota") ? plan : simular(params, conTipo(abonos, "cuota"));
    return { base, plan, todoPlazo, todoCuota, abonos, mixto: tipos.size > 1 };
  }, [monto, tasaMensual, plazoMeses, estado.seguroVida, estado.costosFijos, estado.patrones, estado.inicio]);

  const { base, plan, todoPlazo, todoCuota, abonos, mixto } = calculo;
  const hayAbonos = abonos.length > 0 && plan.totalAbonos > 0;
  const pagosRealizados = plan.filas.filter((f) => f.abono > 0).length;
  const cmp = comparar(base, plan);
  const ahorroSeguro = base.totalSeguroVida - plan.totalSeguroVida;
  const primeraCuotaConSeguro = plan.filas[0] ? plan.filas[0].cuota + plan.filas[0].seguroVida + plan.filas[0].costosFijos : 0;
  const capacidad = estado.ingresoMensual > 0 ? montoMaximoPorIngresos(estado.ingresoMensual, tasaMensual, plazoMeses) : null;
  const relacionCuotaIngreso = estado.ingresoMensual > 0 ? base.cuotaInicial / estado.ingresoMensual : 0;

  const escenarios: Escenario[] = useMemo(() => {
    const lista: Escenario[] = [{ nombre: "Sin abonos", color: paleta.base, resultado: base, punteada: true }];
    if (hayAbonos) {
      lista.push({ nombre: "Abonando para reducir plazo", color: paleta.plazo, resultado: todoPlazo });
      lista.push({ nombre: "Abonando para reducir cuota", color: paleta.cuota, resultado: todoCuota });
      if (mixto) lista.push({ nombre: "Tu plan (mixto)", color: paleta.capital, resultado: plan });
    }
    return lista;
  }, [base, plan, todoPlazo, todoCuota, hayAbonos, mixto, paleta]);

  const compartir = async () => {
    const url = `${location.origin}${location.pathname}#s=${serializar(estado)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      window.prompt("Copia este link:", url);
    }
  };

  const filaComparacion = (nombre: string, r: ResultadoSimulacion, color: string, esPlan: boolean) => {
    const c = comparar(base, r);
    return (
      <tr key={nombre} className={esPlan ? "font-medium" : undefined}>
        <td className="py-2 pr-3 text-left">
          <span className="mr-2 inline-block size-2.5 rounded-full align-middle" style={{ background: color }} />
          {nombre}
          {esPlan && <span className="ml-2 whitespace-nowrap rounded bg-marca-100 px-1.5 py-0.5 text-xs text-marca-700 dark:bg-marca-700/40 dark:text-marca-100">tu elección</span>}
        </td>
        <td className="px-3 py-2">{formatoPesos(r.totalIntereses)}</td>
        <td className="px-3 py-2 text-marca-600 dark:text-marca-500">{c.ahorroIntereses > 0 ? formatoPesos(c.ahorroIntereses) : "—"}</td>
        <td className="px-3 py-2">{formatoDuracion(r.meses)}</td>
        <td className="px-3 py-2">{formatoPesos(r.cuotaFinal)}</td>
        <td className="py-2 pl-3">{c.ahorroPorPesoAbonado > 0 ? `${formatoPesos(c.ahorroPorPesoAbonado * 1000)} por cada $1.000` : "—"}</td>
      </tr>
    );
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(320px,420px)_1fr]">
      {/* Columna de parámetros */}
      <div className="space-y-6">
        <Seccion
          titulo="Tu crédito"
          accion={
            <button type="button" className="text-sm text-slate-500 hover:underline" onClick={() => setEstado(estadoInicial())}>
              Restablecer
            </button>
          }
        >
          <div className="grid grid-cols-2 gap-4">
            <CampoDinero className="col-span-2" etiqueta="Valor del inmueble" valor={estado.valorInmueble} onChange={(v) => set("valorInmueble", v)} />
            <CampoNumero
              etiqueta="Porcentaje financiado"
              sufijo="%"
              min={0}
              max={100}
              valor={Math.round(estado.porcentajeFinanciado * 1000) / 10}
              onChange={(v) => set("porcentajeFinanciado", v / 100)}
              ayuda="Usualmente hasta 70 % (80 % en VIS)"
            />
            <div>
              <span className="etiqueta">Monto del crédito</span>
              <p className="py-2 text-base font-semibold tabular-nums">{formatoPesos(monto)}</p>
              <p className="ayuda">Cuota inicial: {formatoPesos(estado.valorInmueble - monto)}</p>
            </div>
            <CampoNumero
              className="col-span-2"
              etiqueta="Tasa de interés"
              sufijo="%"
              min={0}
              max={100}
              valor={estado.tasa}
              onChange={(v) => set("tasa", v)}
              ayuda={`Equivale a ${formatoPorcentaje(eq.EA)} E.A. · ${formatoPorcentaje(eq.NMV)} N.M.V. · ${formatoPorcentaje(eq.MV, 4)} mensual`}
            >
              <Segmentado
                etiqueta="Tipo de tasa"
                opciones={OPCIONES_TASA}
                valor={estado.tipoTasa}
                onChange={(tipo) => {
                  // Conserva la misma tasa real al cambiar de formato.
                  const nueva = equivalencias(tasaMensual)[tipo] * 100;
                  setEstado((e) => ({ ...e, tipoTasa: tipo, tasa: Math.round(nueva * 10000) / 10000 }));
                }}
              />
            </CampoNumero>
            <CampoNumero etiqueta="Plazo" sufijo="años" min={1} max={40} valor={estado.plazoAnios} onChange={(v) => set("plazoAnios", v)} />
            <div>
              <label className="etiqueta" htmlFor="inicio">
                Primera cuota
              </label>
              <input id="inicio" type="month" className="campo" value={estado.inicio} onChange={(e) => e.target.value && set("inicio", e.target.value)} />
            </div>
          </div>

          <details className="mt-4 group">
            <summary className="cursor-pointer text-sm font-medium text-marca-600">Seguros, otros costos e ingresos</summary>
            <div className="mt-3 grid grid-cols-2 gap-4">
              <CampoNumero
                etiqueta="Seguro de vida"
                sufijo="% mes"
                min={0}
                max={5}
                valor={estado.seguroVida}
                onChange={(v) => set("seguroVida", v)}
                ayuda="Sobre el saldo; suele estar entre 0,03 % y 0,08 %"
              />
              <CampoDinero
                etiqueta="Otros costos al mes"
                valor={estado.costosFijos}
                onChange={(v) => set("costosFijos", v)}
                ayuda="Seguro de hogar, predial prorrateado…"
              />
              <CampoDinero
                className="col-span-2"
                etiqueta="Ingreso mensual del hogar (opcional)"
                valor={estado.ingresoMensual}
                onChange={(v) => set("ingresoMensual", v)}
                ayuda="Para verificar el tope de la primera cuota (30 % de los ingresos)"
              />
            </div>
          </details>
        </Seccion>

        <Seccion titulo="Abonos a capital">
          <EditorAbonos patrones={estado.patrones} onChange={(p) => set("patrones", p)} plazoMeses={plazoMeses} inicio={estado.inicio} />
        </Seccion>
      </div>

      {/* Columna de resultados */}
      <div className="min-w-0 space-y-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Indicador
            titulo="Cuota mensual"
            valor={formatoPesos(plan.cuotaInicial)}
            detalle={primeraCuotaConSeguro > plan.cuotaInicial + 1 ? `${formatoPesos(primeraCuotaConSeguro)} con seguros y costos` : `${plazoMeses} cuotas pactadas`}
          />
          <Indicador
            titulo="Intereses que pagarás"
            valor={formatoPesos(plan.totalIntereses)}
            detalle={hayAbonos ? `Sin abonos: ${formatoPesos(base.totalIntereses)}` : `${formatoPorcentaje(base.totalIntereses / Math.max(monto, 1), 0)} del monto prestado`}
          />
          <Indicador
            destacado={hayAbonos}
            titulo="Te ahorras en intereses"
            valor={hayAbonos ? formatoPesos(cmp.ahorroIntereses) : "—"}
            detalle={
              hayAbonos
                ? `${formatoPorcentaje(cmp.ahorroPorcentaje, 1)} menos${ahorroSeguro > 1 ? ` y ${formatoPesos(ahorroSeguro)} en seguro` : ""}`
                : "Agrega abonos para ver el ahorro"
            }
          />
          <Indicador
            destacado={hayAbonos && cmp.mesesMenos > 0}
            titulo="Terminas de pagar"
            valor={etiquetaFecha(estado.inicio, plan.meses)}
            detalle={
              cmp.mesesMenos > 0
                ? `${formatoDuracion(cmp.mesesMenos)} antes`
                : hayAbonos
                  ? `Cuota final: ${formatoPesos(plan.cuotaFinal)}`
                  : formatoDuracion(plan.meses)
            }
          />
        </div>

        {hayAbonos && (
          <p className="rounded-xl bg-marca-50 px-4 py-3 text-sm text-marca-700 dark:bg-marca-700/20 dark:text-marca-100">
            Abonas en total <strong>{formatoPesos(plan.totalAbonos)}</strong> en {pagosRealizados} {pagosRealizados === 1 ? "pago" : "pagos"}. Cada{" "}
            <strong>$1.000</strong> que abonas te ahorra <strong>{formatoPesos(cmp.ahorroPorPesoAbonado * 1000)}</strong> en intereses.
          </p>
        )}

        {capacidad && (
          <div
            className={`rounded-xl px-4 py-3 text-sm ${
              relacionCuotaIngreso > 0.3
                ? "bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200"
                : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
            }`}
          >
            La cuota es el <strong>{formatoPorcentaje(relacionCuotaIngreso, 1)}</strong> de tus ingresos.{" "}
            {relacionCuotaIngreso > 0.3 ? "Supera el tope del 30 %, por lo que el banco podría no aprobar este monto. " : ""}
            Con tus ingresos, la cuota máxima sería {formatoPesos(capacidad.cuotaMaxima)} y te podrían prestar hasta{" "}
            <strong>{formatoPesos(capacidad.montoMaximo)}</strong> a esta tasa y plazo.
          </div>
        )}

        <section className="tarjeta">
          <GraficaAmortizacion resultado={plan} inicio={estado.inicio} />
        </section>

        <section className="tarjeta">
          <h3 className="mb-2 font-semibold">{hayAbonos ? "¿Reducir plazo o reducir cuota?" : "Saldo del crédito"}</h3>
          <GraficaSaldo escenarios={escenarios} monto={monto} inicio={estado.inicio} />
          {hayAbonos && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[640px] text-right text-sm tabular-nums">
                <thead className="text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="py-2 pr-3 text-left font-medium">Escenario</th>
                    <th className="px-3 py-2 font-medium">Intereses</th>
                    <th className="px-3 py-2 font-medium">Ahorro</th>
                    <th className="px-3 py-2 font-medium">Plazo</th>
                    <th className="px-3 py-2 font-medium">Última cuota</th>
                    <th className="py-2 pl-3 font-medium">Ahorro por abono</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filaComparacion("Sin abonos", base, paleta.base, false)}
                  {filaComparacion("Reducir plazo", todoPlazo, paleta.plazo, !mixto && todoPlazo === plan)}
                  {filaComparacion("Reducir cuota", todoCuota, paleta.cuota, !mixto && todoCuota === plan)}
                  {mixto && filaComparacion("Tu plan (mixto)", plan, paleta.capital, true)}
                </tbody>
              </table>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Reducir plazo casi siempre ahorra más intereses; reducir cuota te deja más flujo de caja cada mes.
              </p>
            </div>
          )}
        </section>

        <TablaAmortizacion resultado={plan} inicio={estado.inicio} />

        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="boton-primario" onClick={compartir}>
            {copiado ? "¡Link copiado!" : "Compartir esta simulación"}
          </button>
          <span className="text-xs text-slate-500 dark:text-slate-400">El link guarda todos tus datos; nada se envía a ningún servidor.</span>
        </div>
      </div>
    </div>
  );
}
