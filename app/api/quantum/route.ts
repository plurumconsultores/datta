// app/api/quantum/route.ts  — Sala digital del taller Efecto Quantum (GEB)
// IMPORTANTE: el import de createClient debe quedar IGUAL al de app/api/radar/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const SECCIONES = ['registro','conexion','tensiones','vf','core','horizon','mercado','compromisos','tensiones_c','aprendizajes','fin']

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sin sesión' }, { status: 401 })
  const [r, c] = await Promise.all([
    supabase.from('respuestas_quantum')
      .select('id, creado_en, pid, actividad, momento, mesa, nombre, filial, datos')
      .order('creado_en', { ascending: true }).limit(10000),
    supabase.from('quantum_control').select('actual, volver').eq('id', 1).single(),
  ])
  if (r.error) return NextResponse.json({ error: r.error.message }, { status: 500 })
  return NextResponse.json({ respuestas: r.data ?? [], control: c.data ?? { actual: 'registro', volver: false } })
}

// POST { datos } guarda el acta · POST { control: { actual, volver } } habilita secciones
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sin sesión' }, { status: 401 })
  // Solo el equipo de Plurum (admin o analista) maneja la sala y el acta; los usuarios del cliente solo miran
  const [{ data: esAdmin }, { data: esEquipo }] = await Promise.all([supabase.rpc('es_admin'), supabase.rpc('es_equipo')])
  if (esAdmin !== true && esEquipo !== true) return NextResponse.json({ error: 'Solo el equipo facilitador puede cambiar la sala' }, { status: 403 })
  const body = await req.json().catch(() => null)
  if (body && body.control) {
    const actual = String(body.control.actual || '')
    if (!SECCIONES.includes(actual)) return NextResponse.json({ error: 'Sección inválida' }, { status: 400 })
    const { error } = await supabase.from('quantum_control')
      .update({ actual, volver: !!body.control.volver, actualizado: new Date().toISOString() }).eq('id', 1)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }
  if (!body || typeof body.datos !== 'object') return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  const { error } = await supabase.from('respuestas_quantum').insert({ actividad: 'acta', nombre: user.email ?? null, datos: body.datos })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
