# Simulador de crédito hipotecario con abonos a capital

Aplicación web para simular un crédito de vivienda (sistema francés, cuota fija) y ver cuánto se ahorra
en intereses y tiempo al hacer abonos a capital: únicos, periódicos, con primas (junio y diciembre) o
cesantías (febrero), reduciendo plazo o reduciendo cuota.

Nació de los cuadernos en [`notebooks/`](notebooks/). El motor de cálculo es un port en TypeScript de
`CuotaMensual` y `calc_table`, con pruebas de paridad contra los resultados del cuaderno.

## Funcionalidades

- Parámetros del crédito: valor del inmueble, % financiado, tasa en E.A., N.M.V. o M.V. (con conversión
  automática), plazo y fecha de la primera cuota.
- Editor de abonos con patrones: abono único, cada N meses, primas, cesantías. Cada patrón permite
  aumento anual del monto y elegir entre reducir plazo o reducir cuota.
- Indicadores: cuota, intereses totales, ahorro en intereses (y en seguro de vida), fecha de fin, y
  ahorro por cada $1.000 abonado.
- Gráfica de amortización (intereses / capital / abonos) por mes o por año.
- Comparación de escenarios: sin abonos vs. reducir plazo vs. reducir cuota (y tu plan si es mixto).
- Seguro de vida sobre el saldo, otros costos mensuales y verificación del tope del 30 % de los ingresos.
- Tabla de amortización exportable a CSV.
- La simulación completa queda en la URL (`#s=…`) para compartirla. No hay backend: todo se calcula
  en el navegador.

## Tecnologías

[Astro](https://astro.build) (sitio estático, bueno para SEO) + una isla de React + TypeScript,
Tailwind CSS 4, Apache ECharts y Vitest.

```
src/core/         motor de cálculo puro (sin UI) + pruebas
  amortizacion.ts   cuota fija, simulación con abonos, comparación, capacidad por ingresos
  patrones.ts       patrones de abono → lista de abonos concretos
  tasas.ts          conversión E.A. / N.M.V. / M.V.
  estado.ts         estado del simulador y serialización en la URL
src/components/   simulador, editor de abonos, gráficas, tabla
src/pages/        página principal + preguntas frecuentes
notebooks/        cuadernos originales en Python
```

## Desarrollo

```bash
npm install
npm run dev      # http://localhost:4321
npm test         # pruebas del motor de cálculo
npm run check    # chequeo de tipos
npm run build    # sitio estático en dist/
```

## Despliegue

`npm run build` genera un sitio estático en `dist/`. Se puede publicar gratis en Cloudflare Pages,
Vercel, Netlify o GitHub Pages; todos detectan Astro automáticamente (comando `npm run build`,
carpeta `dist`).

## Correcciones frente al cuaderno

- La última cuota se ajusta al saldo pendiente: el saldo ya no queda negativo al reducir plazo.
- Un abono nunca supera el saldo.
- Lo pagado se acumula con pagos reales, en lugar de restarlo del total original.
- El abono aparece como serie propia en la gráfica, en lugar de ocultarse.
- El seguro de vida se calcula cada mes sobre el saldo.

## Próximos pasos sugeridos

1. "¿Abonar o invertir?": comparar el ahorro de abonar con invertir el mismo dinero (lógica de
   `notebooks/playground.ipynb`).
2. Créditos en UVR (cuota ajustada por inflación).
3. Guías cortas (E.A. vs N.M.V., plazo vs cuota, UVR vs pesos) como páginas propias para SEO.

> Simulación con fines educativos; no constituye asesoría financiera.
