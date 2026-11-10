import { describe, expect, it } from "vitest";
import { deserializar, estadoInicial, serializar } from "./estado";

describe("estado en la URL", () => {
  it("ida y vuelta", () => {
    const e = { ...estadoInicial(), valorInmueble: 123_456_789, tasa: 9.5 };
    expect(deserializar(`#s=${serializar(e)}`)).toEqual(e);
  });

  it("hash inválido devuelve null", () => {
    expect(deserializar("#s=@@@")).toBeNull();
    expect(deserializar("#s=bm9qc29u")).toBeNull(); // "nojson"
    expect(deserializar("")).toBeNull();
  });
});
