// Ruta del tablero "Laboratorio de Comportamientos · Novambientti" (compromisos por valor)
//
//  GET    → compromisos de la encuesta, acuerdos del equipo y roles del usuario
//  POST   → { accion:'acuerdo', id?, valor, texto, indicador }  agregar o editar un acuerdo (admin o analista)
//           { accion:'acuerdo_borrar', id }                     eliminar un acuerdo (admin o analista)
//           { valor, texto }                                    agregar un compromiso a mano (solo rol admin)
//  PATCH  → editar valor o texto de un compromiso   (solo rol admin)
//  DELETE → eliminar un compromiso o todos           (solo rol admin)
//
// Corre en el servidor de Datta con la sesión del usuario: el tablero no lleva llaves.
// Doble candado: esta ruta pregunta es_admin()/es_equipo() y, además, las políticas de las tablas
// solo dejan escribir a quien tiene ese rol.
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const TABLA = 'novambientti_compromisos_valores';
const ACUERDOS = 'novambientti_acuerdos';

async function sesion() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, esAdmin: false, esEquipo: false };
  const [{ data: esAdmin }, { data: esEquipo }] = await Promise.all([
    supabase.rpc('es_admin'),
    supabase.rpc('es_equipo'),     // admin o analista (si aún no existe, responde error y queda en false)
  ]);
  return { supabase, user, esAdmin: esAdmin === true, esEquipo: esEquipo === true || esAdmin === true };
}

const json = (cuerpo: unknown, status = 200) =>
  NextResponse.json(cuerpo, { status, headers: { 'Cache-Control': 'no-store' } });

const valorOk = (v: unknown) => Number.isInteger(Number(v)) && Number(v) >= 1 && Number(v) <= 8;

function validar(valor: unknown, texto: unknown) {
  if (!valorOk(valor)) return 'Valor no válido';
  if (typeof texto !== 'string' || texto.trim().length < 3 || texto.trim().length > 400) return 'El texto debe tener entre 3 y 400 caracteres';
  return null;
}

export async function GET() {
  const { supabase, user, esAdmin, esEquipo } = await sesion();
  if (!user) return json({ error: 'Sin sesión' }, 401);

  const [comps, acuerdos] = await Promise.all([
    supabase.from(TABLA).select('id, envio, creado_en, valor, texto, origen').order('creado_en', { ascending: true }).limit(10000),
    supabase.from(ACUERDOS).select('id, creado_en, valor, texto, indicador').order('creado_en', { ascending: true }),
  ]);

  // Si todavía no se ha corrido el SQL, el tablero sigue abierto y avisa al equipo
  const avisos: string[] = [];
  if (comps.error) avisos.push('Falta correr el SQL nuevo en Supabase (tabla de compromisos por valor): ' + comps.error.message);
  if (acuerdos.error) avisos.push('Falta correr el SQL nuevo en Supabase (tabla de acuerdos): ' + acuerdos.error.message);
  return json({
    respuestas: comps.error ? [] : (comps.data ?? []),
    acuerdos: acuerdos.error ? [] : (acuerdos.data ?? []),
    esAdmin, esEquipo, avisos, version: '16-oct-B',
  });
}

export async function POST(req: Request) {
  const { supabase, user, esAdmin, esEquipo } = await sesion();
  if (!user) return json({ error: 'Sin sesión' }, 401);

  const b = await req.json().catch(() => ({}));

  // Acuerdos del equipo (admin o analista)
  if (b.accion === 'acuerdo' || b.accion === 'acuerdo_borrar') {
    if (!esEquipo) return json({ error: 'Solo admin o analista pueden editar los acuerdos' }, 403);
    if (b.accion === 'acuerdo_borrar') {
      if (!b.id) return json({ error: 'Falta el id del acuerdo' }, 400);
      const { error } = await supabase.from(ACUERDOS).delete().eq('id', b.id);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }
    const texto = typeof b.texto === 'string' ? b.texto.trim() : '';
    if (texto.length < 3 || texto.length > 300) return json({ error: 'El acuerdo debe tener entre 3 y 300 caracteres' }, 400);
    const valor = valorOk(b.valor) ? Number(b.valor) : null;
    const indicador = typeof b.indicador === 'string' && b.indicador.trim() ? b.indicador.trim().slice(0, 200) : null;
    const { error } = b.id
      ? await supabase.from(ACUERDOS).update({ valor, texto, indicador, actualizado_en: new Date().toISOString() }).eq('id', b.id)
      : await supabase.from(ACUERDOS).insert({ valor, texto, indicador });
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true });
  }

  // Compromiso agregado a mano (por ejemplo, uno que llegó en papel)
  if (!esAdmin) return json({ error: 'Solo el rol admin puede agregar compromisos' }, 403);
  const problema = validar(b.valor, b.texto);
  if (problema) return json({ error: problema }, 400);
  const { error } = await supabase.from(TABLA).insert({ valor: Number(b.valor), texto: b.texto.trim(), origen: 'manual' });
  if (error) return json({ error: error.message }, 500);
  return json({ ok: true });
}

export async function PATCH(req: Request) {
  const { supabase, user, esAdmin } = await sesion();
  if (!user) return json({ error: 'Sin sesión' }, 401);
  if (!esAdmin) return json({ error: 'Solo el rol admin puede editar compromisos' }, 403);

  const b = await req.json().catch(() => ({}));
  if (!b.id) return json({ error: 'Falta el id del compromiso' }, 400);
  const problema = validar(b.valor, b.texto);
  if (problema) return json({ error: problema }, 400);

  const { error } = await supabase.from(TABLA).update({ valor: Number(b.valor), texto: b.texto.trim() }).eq('id', b.id);
  if (error) return json({ error: error.message }, 500);
  return json({ ok: true });
}

export async function DELETE(req: Request) {
  const { supabase, user, esAdmin } = await sesion();
  if (!user) return json({ error: 'Sin sesión' }, 401);
  if (!esAdmin) return json({ error: 'Solo el rol admin puede eliminar compromisos' }, 403);

  const b = await req.json().catch(() => ({}));
  if (b.todo === true) {
    if (b.confirmar !== 'BORRAR') return json({ error: 'Falta la confirmación' }, 400);
    const { error } = await supabase.from(TABLA).delete().not('id', 'is', null);
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true });
  }
  if (!b.id) return json({ error: 'Falta el id del compromiso' }, 400);
  const { error } = await supabase.from(TABLA).delete().eq('id', b.id);
  if (error) return json({ error: error.message }, 500);
  return json({ ok: true });
}
