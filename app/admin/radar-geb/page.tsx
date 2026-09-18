"use client";

/**
 * Panel de la base del Radar de mis Estados.
 * Ruta: /admin/radar-geb  (protegida por proxy.ts, requiere sesión de Datta)
 *
 * Ver: cualquier usuario autenticado.
 * Agregar, editar y borrar: solo quien tenga rol 'admin' (lo impone la base con RLS).
 */

import { createBrowserClient } from "@supabase/ssr";
import { useCallback, useEffect, useMemo, useState } from "react";

const FILIALES = ["TGI", "Enlaza", "Corporativa"] as const;
const GENEROS = ["Masculino", "Femenino", "Otro"] as const;
const ESTADOS = ["Prisa", "Frustración", "Fatiga", "Complacencia"] as const;
const REFRESCO_MS = 10000;

type Fila = {
  id: number;
  creado_en: string;
  filial: string;
  genero: string | null;
  estado: string;
  origen: string;
  nota: string | null;
};

type Mov = {
  id: number;
  ocurrido_en: string;
  actor_email: string | null;
  accion: string;
  registro_id: number | null;
  antes: Record<string, unknown> | null;
  despues: Record<string, unknown> | null;
};

const COLOR: Record<string, string> = {
  TGI: "#3C55A3",
  Enlaza: "#C89538",
  Corporativa: "#091539",
};

export default function PanelRadar() {
  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      ),
    [],
  );

  const [admin, setAdmin] = useState(false);
  const [filas, setFilas] = useState<Fila[]>([]);
  const [movs, setMovs] = useState<Mov[]>([]);
  const [vista, setVista] = useState<"base" | "historial">("base");
  const [aviso, setAviso] = useState("");
  const [cargando, setCargando] = useState(true);
  const [nuevo, setNuevo] = useState({
    filial: "TGI",
    genero: "Masculino",
    estado: "Prisa",
    nota: "",
  });

  const cargar = useCallback(async () => {
    const { data: rs, error } = await supabase
      .from("respuestas_radar")
      .select("id,creado_en,filial,genero,estado,origen,nota")
      .order("id", { ascending: false })
      .limit(1000);
    if (error) setAviso("No se pudo leer la base: " + error.message);
    else setFilas((rs ?? []) as Fila[]);

    const { data: ls } = await supabase
      .from("respuestas_radar_log")
      .select("id,ocurrido_en,actor_email,accion,registro_id,antes,despues")
      .order("id", { ascending: false })
      .limit(300);
    setMovs((ls ?? []) as Mov[]);
    setCargando(false);
  }, [supabase]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("es_admin");
      setAdmin(Boolean(data));
      await cargar();
    })();
    const t = setInterval(cargar, REFRESCO_MS);
    return () => clearInterval(t);
  }, [supabase, cargar]);

  const conteo = useMemo(() => {
    const c: Record<string, number> = { TGI: 0, Enlaza: 0, Corporativa: 0 };
    filas.forEach((f) => (c[f.filial] = (c[f.filial] ?? 0) + 1));
    return c;
  }, [filas]);

  async function agregar() {
    setAviso("");
    const { error } = await supabase.from("respuestas_radar").insert({
      filial: nuevo.filial,
      genero: nuevo.genero,
      estado: nuevo.estado,
      origen: "papel",
      nota: nuevo.nota || null,
      respuestas: { origen: "papel", capturado_en_panel: true },
    });
    if (error) setAviso("No se pudo agregar: " + error.message);
    else {
      setNuevo({ ...nuevo, nota: "" });
      await cargar();
    }
  }

  async function editar(id: number, campo: keyof Fila, valor: string) {
    setAviso("");
    const { error } = await supabase
      .from("respuestas_radar")
      .update({ [campo]: valor })
      .eq("id", id);
    if (error) setAviso("No se pudo editar: " + error.message);
    await cargar();
  }

  async function borrar(id: number) {
    if (!confirm(`¿Borrar el registro ${id}? Queda constancia en el historial.`)) return;
    setAviso("");
    const { error } = await supabase.from("respuestas_radar").delete().eq("id", id);
    if (error) setAviso("No se pudo borrar: " + error.message);
    await cargar();
  }

  const fecha = (s: string) =>
    new Date(s).toLocaleString("es-CO", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  const cambios = (m: Mov) => {
    if (m.accion === "alta") return resumenFila(m.despues);
    if (m.accion === "borrado") return resumenFila(m.antes);
    const a = m.antes ?? {};
    const b = m.despues ?? {};
    const dif = ["filial", "genero", "estado", "origen", "nota"]
      .filter((k) => String(a[k] ?? "") !== String(b[k] ?? ""))
      .map((k) => `${k}: ${a[k] ?? "—"} → ${b[k] ?? "—"}`);
    return dif.length ? dif.join(" · ") : "sin cambios visibles";
  };
  const resumenFila = (o: Record<string, unknown> | null) =>
    o ? `${o.filial ?? "—"} · ${o.genero ?? "—"} · ${o.estado ?? "—"} (${o.origen ?? "web"})` : "—";

  return (
    <div className="pr-wrap">
      <style>{css}</style>

      <header className="pr-top">
        <div>
          <h1>Base del Radar de mis Estados</h1>
          <p>
            Acuerdos de Vida · Cultura GEB
            {admin ? (
              <span className="pr-tag ok">Puedes editar</span>
            ) : (
              <span className="pr-tag">Solo lectura · requiere rol admin</span>
            )}
          </p>
        </div>
        <a className="pr-btn sec" href="/d/radar-carrera-geb" target="_blank" rel="noreferrer">
          Ver el tablero
        </a>
      </header>

      <div className="pr-kpis">
        <div className="pr-kpi">
          <span>Total</span>
          <b>{filas.length}</b>
        </div>
        {FILIALES.map((f) => (
          <div className="pr-kpi" key={f}>
            <span>
              <i style={{ background: COLOR[f] }} />
              {f}
            </span>
            <b>{conteo[f] ?? 0}</b>
          </div>
        ))}
      </div>

      <div className="pr-tabs">
        <button className={vista === "base" ? "on" : ""} onClick={() => setVista("base")}>
          Registros
        </button>
        <button className={vista === "historial" ? "on" : ""} onClick={() => setVista("historial")}>
          Historial de cambios
        </button>
        <span className="pr-vivo">Se actualiza cada 10 segundos</span>
      </div>

      {aviso && <div className="pr-error">{aviso}</div>}

      {vista === "base" && (
        <>
          {admin && (
            <div className="pr-alta">
              <strong>Agregar respuesta de papel</strong>
              <div className="pr-alta-campos">
                <select
                  value={nuevo.filial}
                  onChange={(e) => setNuevo({ ...nuevo, filial: e.target.value })}
                >
                  {FILIALES.map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </select>
                <select
                  value={nuevo.genero}
                  onChange={(e) => setNuevo({ ...nuevo, genero: e.target.value })}
                >
                  {GENEROS.map((g) => (
                    <option key={g}>{g}</option>
                  ))}
                </select>
                <select
                  value={nuevo.estado}
                  onChange={(e) => setNuevo({ ...nuevo, estado: e.target.value })}
                >
                  {ESTADOS.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
                <input
                  placeholder="Nota (opcional)"
                  value={nuevo.nota}
                  onChange={(e) => setNuevo({ ...nuevo, nota: e.target.value })}
                />
                <button className="pr-btn" onClick={agregar}>
                  Agregar
                </button>
              </div>
            </div>
          )}

          <div className="pr-tabla">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Fecha</th>
                  <th>Filial</th>
                  <th>Género</th>
                  <th>Estado</th>
                  <th>Origen</th>
                  <th>Nota</th>
                  {admin && <th></th>}
                </tr>
              </thead>
              <tbody>
                {cargando && (
                  <tr>
                    <td colSpan={8}>Cargando…</td>
                  </tr>
                )}
                {!cargando && filas.length === 0 && (
                  <tr>
                    <td colSpan={8}>Todavía no hay respuestas.</td>
                  </tr>
                )}
                {filas.map((f) => (
                  <tr key={f.id}>
                    <td className="num">{f.id}</td>
                    <td>{fecha(f.creado_en)}</td>
                    <td>
                      {admin ? (
                        <select
                          value={f.filial}
                          onChange={(e) => editar(f.id, "filial", e.target.value)}
                        >
                          {FILIALES.map((x) => (
                            <option key={x}>{x}</option>
                          ))}
                        </select>
                      ) : (
                        f.filial
                      )}
                    </td>
                    <td>
                      {admin ? (
                        <select
                          value={f.genero ?? ""}
                          onChange={(e) => editar(f.id, "genero", e.target.value)}
                        >
                          <option value="">—</option>
                          {GENEROS.map((x) => (
                            <option key={x}>{x}</option>
                          ))}
                        </select>
                      ) : (
                        (f.genero ?? "—")
                      )}
                    </td>
                    <td>
                      {admin ? (
                        <select
                          value={f.estado}
                          onChange={(e) => editar(f.id, "estado", e.target.value)}
                        >
                          {ESTADOS.map((x) => (
                            <option key={x}>{x}</option>
                          ))}
                        </select>
                      ) : (
                        f.estado
                      )}
                    </td>
                    <td>
                      <span className={"pr-org " + f.origen}>{f.origen}</span>
                    </td>
                    <td className="nota">{f.nota ?? ""}</td>
                    {admin && (
                      <td>
                        <button className="pr-del" onClick={() => borrar(f.id)} title="Borrar">
                          ✕
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {vista === "historial" && (
        <div className="pr-tabla">
          <table>
            <thead>
              <tr>
                <th>Cuándo</th>
                <th>Quién</th>
                <th>Acción</th>
                <th>Registro</th>
                <th>Qué cambió</th>
              </tr>
            </thead>
            <tbody>
              {movs.length === 0 && (
                <tr>
                  <td colSpan={5}>Sin movimientos todavía.</td>
                </tr>
              )}
              {movs.map((m) => (
                <tr key={m.id}>
                  <td>{fecha(m.ocurrido_en)}</td>
                  <td>{m.actor_email ?? "encuesta pública"}</td>
                  <td>
                    <span className={"pr-acc " + m.accion}>{m.accion}</span>
                  </td>
                  <td className="num">{m.registro_id ?? "—"}</td>
                  <td className="nota">{cambios(m)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const css = `
.pr-wrap{max-width:1180px;margin:0 auto;padding:22px 18px 60px;
  font-family:'Segoe UI',system-ui,-apple-system,Roboto,Helvetica,Arial,sans-serif;color:#141B33}
.pr-top{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;
  background:linear-gradient(100deg,#091539 0%,#26376F 58%,#3C55A3 100%);color:#fff;
  border-radius:16px;padding:18px 20px;box-shadow:0 10px 30px rgba(9,21,57,.18)}
.pr-top h1{margin:0;font-size:20px;font-weight:800}
.pr-top p{margin:4px 0 0;font-size:13px;color:rgba(255,255,255,.8);display:flex;align-items:center;gap:10px}
.pr-tag{background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.3);border-radius:999px;
  padding:2px 10px;font-size:11.5px;font-weight:700}
.pr-tag.ok{background:rgba(200,149,56,.9);color:#091539;border-color:transparent}
.pr-btn{background:#091539;color:#fff;border:0;border-radius:999px;padding:10px 18px;font-weight:700;
  font-size:14px;cursor:pointer;text-decoration:none;display:inline-block}
.pr-btn.sec{background:#fff;color:#091539}
.pr-kpis{display:flex;gap:12px;margin:16px 0;flex-wrap:wrap}
.pr-kpi{background:#fff;border:1px solid #E2E6EE;border-radius:12px;padding:10px 16px;min-width:130px;
  box-shadow:0 1px 2px rgba(9,21,57,.05)}
.pr-kpi span{display:flex;align-items:center;gap:7px;font-size:12px;color:#5C6478;font-weight:700;
  text-transform:uppercase;letter-spacing:.4px}
.pr-kpi i{width:10px;height:10px;border-radius:3px;display:inline-block}
.pr-kpi b{font-size:26px;font-weight:800;color:#091539}
.pr-tabs{display:flex;gap:8px;align-items:center;margin-bottom:12px}
.pr-tabs button{border:1px solid #E2E6EE;background:#fff;border-radius:999px;padding:8px 16px;
  font:inherit;font-size:14px;font-weight:700;color:#5C6478;cursor:pointer}
.pr-tabs button.on{background:#091539;color:#fff;border-color:#091539}
.pr-vivo{margin-left:auto;font-size:12px;color:#6F7890}
.pr-error{background:#FDECEA;border-left:4px solid #C0392B;border-radius:8px;padding:10px 14px;
  font-size:13.5px;margin-bottom:12px;color:#8A2D22}
.pr-alta{background:#fff;border:1px solid #E2E6EE;border-radius:14px;padding:14px 16px;margin-bottom:14px}
.pr-alta strong{font-size:13px;text-transform:uppercase;letter-spacing:.5px;color:#091539}
.pr-alta-campos{display:flex;gap:10px;margin-top:10px;flex-wrap:wrap}
.pr-alta-campos select,.pr-alta-campos input{font:inherit;font-size:14px;padding:10px 12px;
  border:2px solid #E2E6EE;border-radius:10px;background:#FAFBFD;color:#141B33}
.pr-alta-campos input{min-width:220px;flex:1}
.pr-tabla{background:#fff;border:1px solid #E2E6EE;border-radius:14px;overflow:auto}
.pr-tabla table{width:100%;border-collapse:collapse;font-size:14px}
.pr-tabla th{text-align:left;font-size:11.5px;text-transform:uppercase;letter-spacing:.5px;color:#5C6478;
  padding:12px 14px;border-bottom:1px solid #E2E6EE;white-space:nowrap;background:#F7F9FC}
.pr-tabla td{padding:9px 14px;border-bottom:1px solid #EEF1F6;vertical-align:middle}
.pr-tabla tr:last-child td{border-bottom:0}
.pr-tabla td.num{color:#6F7890;font-variant-numeric:tabular-nums}
.pr-tabla td.nota{color:#5C6478;font-size:13px}
.pr-tabla select{font:inherit;font-size:13.5px;padding:6px 8px;border:1px solid #E2E6EE;border-radius:8px;
  background:#fff;color:#141B33}
.pr-org{font-size:11.5px;font-weight:700;border-radius:999px;padding:3px 9px;text-transform:uppercase;
  letter-spacing:.4px;background:#EEF3FC;color:#26376F}
.pr-org.papel{background:rgba(200,149,56,.18);color:#8A5A10}
.pr-acc{font-size:11.5px;font-weight:700;border-radius:999px;padding:3px 9px;text-transform:uppercase;
  letter-spacing:.4px;background:#EEF3FC;color:#26376F}
.pr-acc.borrado{background:#FDECEA;color:#A3341F}
.pr-acc.edicion{background:rgba(200,149,56,.18);color:#8A5A10}
.pr-del{border:0;background:#FDECEA;color:#A3341F;border-radius:8px;width:30px;height:30px;
  font-size:15px;font-weight:800;cursor:pointer}
@media (max-width:700px){.pr-top{flex-direction:column}.pr-alta-campos input{min-width:0}}
`;
