// Ruta del tablero "Laboratorio de Comportamientos · Novambientti"
//
//  GET    → aportes, grupos (sesiones) y grupo actual con su fase + roles del usuario
//  POST   → { accion:'fase', fase }            cambiar la fase del grupo actual  (admin o analista)
//           { accion:'nuevo_grupo', nombre }   cerrar el grupo actual y empezar otro en cero (admin o analista)
//           { fase, texto }                    agregar un aporte a mano          (solo rol admin)
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
  if (!user) return { supabase, user: null, esAdmin: false, esEquipo: false };
  const [{ data: esAdmin }, { data: esEquipo }] = await Promise.all([
    supabase.rpc('es_admin'),
    supabase.rpc('es_equipo'),     // admin o analista: el equipo que facilita
  ]);
  return { supabase, user, esAdmin: esAdmin === true, esEquipo: esEquipo === true || esAdmin === true };
}

const json = (cuerpo: unknown, status = 200) =>
  NextResponse.json(cuerpo, { status, headers: { 'Cache-Control': 'no-store' } });

function validar(fase: unknown, texto: unknown) {
  if (typeof fase !== 'string' || !FASES.includes(fase)) return 'Fase no válida';
  if (typeof texto !== 'string' || texto.trim().length < 3 || texto.trim().length > 400) return 'El texto debe tener entre 3 y 400 caracteres';
  return null;
}

export async function GET() {
  const { supabase, user, esAdmin, esEquipo } = await sesion();
  if (!user) return json({ error: 'Sin sesión' }, 401);

  const [aportes, grupos] = await Promise.all([
    supabase.from(TABLA).select('id, creado_en, fase, texto, origen').order('creado_en', { ascending: true }).limit(5000),
    supabase.from('novambientti_sesiones').select('id, nombre, inicio, fin, fase').order('inicio', { ascending: true }),
  ]);
  if (aportes.error) return json({ error: aportes.error.message }, 500);
  if (grupos.error) return json({ error: grupos.error.message }, 500);

  const sesiones = grupos.data ?? [];
  const actual = [...sesiones].reverse().find((g) => !g.fin) ?? null;
  return json({ respuestas: aportes.data ?? [], sesiones, actual, esAdmin, esEquipo });
}

export async function POST(req: Request) {
  const { supabase, user, esAdmin, esEquipo } = await sesion();
  if (!user) return json({ error: 'Sin sesión' }, 401);

  const b = await req.json().catch(() => ({}));

  // Facilitación (admin o analista): fase y grupo nuevo
  if (b.accion === 'fase' || b.accion === 'nuevo_grupo') {
    if (!esEquipo) return json({ error: 'Solo admin o analista pueden facilitar la actividad' }, 403);
    if (b.accion === 'fase') {
      if (!FASES.includes(b.fase)) return json({ error: 'Fase no válida' }, 400);
      const { error } = await supabase.rpc('novambientti_fijar_fase', { p_fase: b.fase });
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }
    const nombre = typeof b.nombre === 'string' && b.nombre.trim() ? b.nombre.trim().slice(0, 60) : 'Grupo nuevo';
    const { error } = await supabase.rpc('novambientti_nuevo_grupo', { p_nombre: nombre });
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true });
  }

  if (!esAdmin) return json({ error: 'Solo el rol admin puede agregar aportes' }, 403);
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
