import type { TipoAbono } from "../core/amortizacion";
import { formatoPesos } from "../core/formato";
import { etiquetaFecha, expandirPatron, type Patron } from "../core/patrones";
import { CampoDinero, CampoNumero, Segmentado } from "./Campos";

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const nuevoId = () => Math.random().toString(36).slice(2, 10);

type Plantilla = { texto: string; crear: () => Patron };

const PLANTILLAS: Plantilla[] = [
  {
    texto: "Abono único",
    crear: () => ({ id: nuevoId(), kind: "unico", mes: 12, monto: 10_000_000, tipo: "plazo", crecimientoAnual: 0 }),
  },
  {
    texto: "Cada N meses",
    crear: () => ({
      id: nuevoId(),
      kind: "periodico",
      desde: 1,
      cada: 1,
      veces: 0,
      monto: 300_000,
      tipo: "plazo",
      crecimientoAnual: 0,
    }),
  },
  {
    texto: "Primas (jun y dic)",
    crear: () => ({
      id: nuevoId(),
      kind: "calendario",
      etiqueta: "Primas",
      mesesDelAnio: [6, 12],
      desde: 1,
      anios: 0,
      monto: 1_500_000,
      tipo: "plazo",
      crecimientoAnual: 0,
    }),
  },
  {
    texto: "Cesantías (feb)",
    crear: () => ({
      id: nuevoId(),
      kind: "calendario",
      etiqueta: "Cesantías",
      mesesDelAnio: [2],
      desde: 1,
      anios: 0,
      monto: 3_000_000,
      tipo: "plazo",
      crecimientoAnual: 0,
    }),
  },
];

function titulo(p: Patron): string {
  switch (p.kind) {
    case "unico":
      return "Abono único";
    case "periodico":
      return p.cada === 1 ? "Abono mensual" : `Abono cada ${p.cada} meses`;
    case "calendario":
      return p.etiqueta || "Abono en meses fijos";
  }
}

const OPCIONES_TIPO: { valor: TipoAbono; texto: string; titulo: string }[] = [
  { valor: "plazo", texto: "Reducir plazo", titulo: "Mantienes la cuota y terminas de pagar antes" },
  { valor: "cuota", texto: "Reducir cuota", titulo: "Mantienes el plazo y pagas una cuota menor" },
];

function TarjetaPatron({
  patron,
  plazoMeses,
  inicio,
  onChange,
  onEliminar,
}: {
  patron: Patron;
  plazoMeses: number;
  inicio: string;
  onChange: (p: Patron) => void;
  onEliminar: () => void;
}) {
  const abonos = expandirPatron(patron, plazoMeses, inicio);
  const total = abonos.reduce((a, b) => a + b.monto, 0);
  const set = (cambios: Partial<Patron>) => onChange({ ...patron, ...cambios } as Patron);

  return (
    <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="font-medium">{titulo(patron)}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {abonos.length} {abonos.length === 1 ? "abono" : "abonos"} programados · {formatoPesos(total)}
            {abonos.length > 0 && ` · primero en ${etiquetaFecha(inicio, abonos[0].mes)}`}
          </p>
        </div>
        <button type="button" onClick={onEliminar} className="boton px-2 text-slate-500" aria-label="Eliminar abono">
          ✕
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <CampoDinero
          className="col-span-2 sm:col-span-1"
          etiqueta="Monto de cada abono"
          valor={patron.monto}
          onChange={(monto) => set({ monto })}
        />

        {patron.kind === "unico" && (
          <CampoNumero
            className="col-span-2 sm:col-span-1"
            etiqueta="Mes del crédito"
            valor={patron.mes}
            min={1}
            max={plazoMeses}
            onChange={(mes) => set({ mes: Math.round(mes) })}
            ayuda={etiquetaFecha(inicio, patron.mes)}
          />
        )}

        {patron.kind === "periodico" && (
          <>
            <CampoNumero
              className="col-span-2 sm:col-span-1"
              etiqueta="Cada cuántos meses"
              valor={patron.cada}
              min={1}
              max={plazoMeses}
              onChange={(cada) => set({ cada: Math.round(cada) })}
            />
            <CampoNumero
              etiqueta="Desde el mes"
              valor={patron.desde}
              min={1}
              max={plazoMeses}
              onChange={(desde) => set({ desde: Math.round(desde) })}
              ayuda={etiquetaFecha(inicio, patron.desde)}
            />
            <CampoNumero
              etiqueta="Cuántas veces"
              valor={patron.veces}
              min={0}
              onChange={(veces) => set({ veces: Math.round(veces) })}
              ayuda="0 = hasta terminar"
            />
          </>
        )}

        {patron.kind === "calendario" && (
          <>
            <div className="col-span-2">
              <span className="etiqueta">Meses del año</span>
              <div className="flex flex-wrap gap-1">
                {MESES.map((nombre, idx) => {
                  const m = idx + 1;
                  const activo = patron.mesesDelAnio.includes(m);
                  return (
                    <button
                      key={m}
                      type="button"
                      aria-pressed={activo}
                      onClick={() =>
                        set({
                          mesesDelAnio: activo
                            ? patron.mesesDelAnio.filter((x) => x !== m)
                            : [...patron.mesesDelAnio, m].sort((a, b) => a - b),
                        })
                      }
                      className={`rounded-md border px-2 py-1 text-xs font-medium transition ${
                        activo
                          ? "border-marca-600 bg-marca-600 text-white"
                          : "border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                      }`}
                    >
                      {nombre}
                    </button>
                  );
                })}
              </div>
            </div>
            <CampoNumero
              etiqueta="Desde el mes"
              valor={patron.desde}
              min={1}
              max={plazoMeses}
              onChange={(desde) => set({ desde: Math.round(desde) })}
              ayuda={etiquetaFecha(inicio, patron.desde)}
            />
            <CampoNumero
              etiqueta="Durante (años)"
              valor={patron.anios}
              min={0}
              onChange={(anios) => set({ anios: Math.round(anios) })}
              ayuda="0 = hasta terminar"
            />
          </>
        )}

        {patron.kind !== "unico" && (
          <CampoNumero
            className="col-span-2 sm:col-span-1"
            etiqueta="Aumento anual del abono"
            sufijo="%"
            valor={Math.round(patron.crecimientoAnual * 10000) / 100}
            min={0}
            max={100}
            onChange={(v) => set({ crecimientoAnual: v / 100 })}
            ayuda="Por ejemplo, si tu salario sube cada año"
          />
        )}

        <div className="col-span-2">
          <span className="etiqueta">Al abonar quiero…</span>
          <Segmentado etiqueta="Tipo de abono" opciones={OPCIONES_TIPO} valor={patron.tipo} onChange={(tipo) => set({ tipo })} />
        </div>
      </div>
    </div>
  );
}

export function EditorAbonos({
  patrones,
  onChange,
  plazoMeses,
  inicio,
}: {
  patrones: Patron[];
  onChange: (p: Patron[]) => void;
  plazoMeses: number;
  inicio: string;
}) {
  return (
    <div className="space-y-3">
      {patrones.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          Aún no tienes abonos. Agrega uno para ver cuánto te ahorras.
        </p>
      )}
      {patrones.map((p, idx) => (
        <TarjetaPatron
          key={p.id}
          patron={p}
          plazoMeses={plazoMeses}
          inicio={inicio}
          onChange={(nuevo) => onChange(patrones.map((x, i) => (i === idx ? nuevo : x)))}
          onEliminar={() => onChange(patrones.filter((_, i) => i !== idx))}
        />
      ))}
      <div className="flex flex-wrap gap-2">
        {PLANTILLAS.map((pl) => (
          <button key={pl.texto} type="button" className="boton" onClick={() => onChange([...patrones, pl.crear()])}>
            + {pl.texto}
          </button>
        ))}
      </div>
    </div>
  );
}
