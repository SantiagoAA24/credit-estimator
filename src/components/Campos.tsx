import { useEffect, useId, useState, type ReactNode } from "react";
import { formatoEntero } from "../core/formato";

interface CampoBase {
  etiqueta: string;
  ayuda?: ReactNode;
  className?: string;
}

/** Campo de dinero con separadores de miles (es-CO). */
export function CampoDinero({
  etiqueta,
  ayuda,
  valor,
  onChange,
  className,
}: CampoBase & { valor: number; onChange: (v: number) => void }) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="etiqueta">
        {etiqueta}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">$</span>
        <input
          id={id}
          className="campo pl-7"
          inputMode="numeric"
          value={valor ? formatoEntero(valor) : ""}
          placeholder="0"
          onChange={(e) => onChange(Number(e.target.value.replace(/\D/g, "")) || 0)}
        />
      </div>
      {ayuda && <p className="ayuda">{ayuda}</p>}
    </div>
  );
}

const aTexto = (v: number) => (Number.isFinite(v) ? String(v).replace(".", ",") : "");
const aNumero = (t: string) => Number.parseFloat(t.replace(",", "."));

/** Campo numérico que acepta coma o punto decimal y permite estados intermedios ("12,"). */
export function CampoNumero({
  etiqueta,
  ayuda,
  valor,
  onChange,
  sufijo,
  min,
  max,
  className,
  children,
}: CampoBase & {
  valor: number;
  onChange: (v: number) => void;
  sufijo?: string;
  min?: number;
  max?: number;
  children?: ReactNode;
}) {
  const id = useId();
  const [texto, setTexto] = useState(aTexto(valor));

  useEffect(() => {
    if (aNumero(texto) !== valor) setTexto(aTexto(valor));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor]);

  return (
    <div className={className}>
      <label htmlFor={id} className="etiqueta">
        {etiqueta}
      </label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            id={id}
            className={`campo ${sufijo ? "pr-10" : ""}`}
            inputMode="decimal"
            value={texto}
            onChange={(e) => {
              const t = e.target.value.replace(/[^\d.,-]/g, "");
              setTexto(t);
              let n = aNumero(t);
              if (!Number.isFinite(n)) return;
              if (min !== undefined) n = Math.max(min, n);
              if (max !== undefined) n = Math.min(max, n);
              onChange(n);
            }}
            onBlur={() => setTexto(aTexto(valor))}
          />
          {sufijo && (
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-400">
              {sufijo}
            </span>
          )}
        </div>
        {children}
      </div>
      {ayuda && <p className="ayuda">{ayuda}</p>}
    </div>
  );
}

/** Selector segmentado (botones tipo pestaña). */
export function Segmentado<T extends string>({
  opciones,
  valor,
  onChange,
  etiqueta,
}: {
  opciones: { valor: T; texto: string; titulo?: string }[];
  valor: T;
  onChange: (v: T) => void;
  etiqueta?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={etiqueta}
      className="inline-flex rounded-lg border border-slate-300 bg-slate-100 p-0.5 dark:border-slate-700 dark:bg-slate-800"
    >
      {opciones.map((o) => (
        <button
          key={o.valor}
          type="button"
          role="radio"
          aria-checked={valor === o.valor}
          title={o.titulo}
          onClick={() => onChange(o.valor)}
          className={`rounded-md px-2.5 py-1 text-sm font-medium transition ${
            valor === o.valor
              ? "bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white"
              : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          }`}
        >
          {o.texto}
        </button>
      ))}
    </div>
  );
}
