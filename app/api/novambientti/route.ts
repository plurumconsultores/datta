// Ruta del tablero "Laboratorio de Comportamientos · Novambientti"
//
//  GET    → aportes de la encuesta (cualquier usuario con sesión) + si el usuario es admin
//  POST   → agregar un aporte a mano            (solo rol admin)
//  PATCH  → editar fase o texto de un aporte     (solo rol admin)
//  DELETE → eliminar un aporte o todos           (solo rol admin)
//
// Corre en el servidor de Datta con la sesión del usuario: el tablero no lleva llaves.
// Doble candado: esta ruta pregunta es_admin() y, además, las políticas de la tabla
// solo dejan insertar/editar/borrar a quien es admin.
//
// IMPORTANTE: la línea de import debe ser la misma que usa app/api/radar/route.ts.
// Si allá dice algo distinto a "createClient" desde "@/lib/supabase/server", cópiala tal cual.
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const TABLA = 'respuestas_novambientti';
const FASES = ['stop', 'start', 'cont'];

async function sesion() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, esAdmin: false };
  const { data: esAdmin } = await supabase.rpc('es_admin');
  return { supabase, user, esAdmin: esAdmin === true };
}

const json = (cuerpo: unknown, status = 200) =>
  NextResponse.json(cuerpo, { status, headers: { 'Cache-Control': 'no-store' } });

function validar(fase: unknown, texto: unknown) {
  if (typeof fase !== 'string' || !FASES.includes(fase)) return 'Fase no válida';
  if (typeof texto !== 'string' || texto.trim().length < 3 || texto.trim().length > 400) return 'El texto debe tener entre 3 y 400 caracteres';
  return null;
}

export async function GET() {
  const { supabase, user, esAdmin } = await sesion();
  if (!user) return json({ error: 'Sin sesión' }, 401);

  const { data, error } = await supabase
    .from(TABLA)
    .select('id, creado_en, fase, texto, origen')
    .order('creado_en', { ascending: true })
    .limit(2000);

  if (error) return json({ error: error.message }, 500);
  return json({ respuestas: data ?? [], esAdmin });
}

export async function POST(req: Request) {
  const { supabase, user, esAdmin } = await sesion();
  if (!user) return json({ error: 'Sin sesión' }, 401);
  if (!esAdmin) return json({ error: 'Solo el rol admin puede agregar aportes' }, 403);

  const b = await req.json().catch(() => ({}));
  const problema = validar(b.fase, b.texto);
  if (problema) return json({ error: problema }, 400);

  const { error } = await supabase.from(TABLA).insert({ fase: b.fase, texto: b.texto.trim(), origen: 'manual' });
  if (error) return json({ error: error.message }, 500);
  return json({ ok: true });
}

export async function PATCH(req: Request) {
  const { supabase, user, esAdmin } = await sesion();
  if (!user) return json({ error: 'Sin sesión' }, 401);
  if (!esAdmin) return json({ error: 'Solo el rol admin puede editar aportes' }, 403);

  const b = await req.json().catch(() => ({}));
  if (!b.id) return json({ error: 'Falta el id del aporte' }, 400);
  const problema = validar(b.fase, b.texto);
  if (problema) return json({ error: problema }, 400);

  const { error } = await supabase.from(TABLA).update({ fase: b.fase, texto: b.texto.trim() }).eq('id', b.id);
  if (error) return json({ error: error.message }, 500);
  return json({ ok: true });
}

export async function DELETE(req: Request) {
  const { supabase, user, esAdmin } = await sesion();
  if (!user) return json({ error: 'Sin sesión' }, 401);
  if (!esAdmin) return json({ error: 'Solo el rol admin puede eliminar aportes' }, 403);

  const b = await req.json().catch(() => ({}));
  if (b.todo === true) {
    if (b.confirmar !== 'BORRAR') return json({ error: 'Falta la confirmación' }, 400);
    const { error } = await supabase.from(TABLA).delete().not('id', 'is', null);
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true });
  }
  if (!b.id) return json({ error: 'Falta el id del aporte' }, 400);
  const { error } = await supabase.from(TABLA).delete().eq('id', b.id);
  if (error) return json({ error: error.message }, 500);
  return json({ ok: true });
}
