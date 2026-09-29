-- =====================================================================
-- Encuesta EXCO - 2026 (Banconal) — preguntas del instrumento
-- =====================================================================
-- Carga las 6 preguntas demográficas (con las opciones que se desglosan de
-- la respuesta anterior), las 42 preguntas de la batería final y las 5
-- preguntas ANCLA, todas en escala de 0 a 10.
--
-- Ajustes del 29-sep-2026 (correo de Vanessa Hernández, Banconal):
--   - Se agregan las 5 ANCLAS al final (ancla_1 a ancla_5); la 4 dice
--     "comprometido/a" y no "motivado/a".
--   - "Gobernanza y Gestión de TI" queda solo bajo Innovación y Tecnología
--     (se quita de Negocios).
--   - Se quita "Banco Nacional de Panamá" de los lugares de trabajo.
--   - La bienvenida dice "Banco Nacional de Panamá" completo (paso 3b).
--
-- Cómo usarlo: pegar este archivo completo en el SQL Editor de Supabase
-- (proyecto de Datta) y ejecutar. Son cuatro pasos; el último confirma.
--
-- REEMPLAZA las preguntas que la encuesta tenga hoy. El paso 2 las guarda
-- antes en una tabla de respaldo, así que se pueden recuperar.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) ¿Es la encuesta correcta? Debe devolver exactamente una fila.
-- ---------------------------------------------------------------------
select id, slug, titulo, estado, jsonb_array_length(preguntas) as preguntas_hoy
  from public.encuestas
 where trim(titulo) = 'Encuesta EXCO - 2026';

-- ---------------------------------------------------------------------
-- 2) Respaldo de lo que tiene hoy, por si hay que volver atrás.
--    Para recuperarlo: update public.encuestas e set preguntas = r.preguntas
--      from public.encuestas_respaldo_preguntas r
--     where r.encuesta_id = e.id order by r.guardado_en desc limit 1;
-- ---------------------------------------------------------------------
create table if not exists public.encuestas_respaldo_preguntas (
  id          bigint generated always as identity primary key,
  encuesta_id uuid not null,
  titulo      text,
  preguntas   jsonb not null,
  guardado_en timestamptz not null default now()
);

alter table public.encuestas_respaldo_preguntas enable row level security;
drop policy if exists respaldo_preguntas_equipo on public.encuestas_respaldo_preguntas;
create policy respaldo_preguntas_equipo on public.encuestas_respaldo_preguntas
  for all to authenticated
  using (public.puede_ver_todo()) with check (public.puede_ver_todo());

insert into public.encuestas_respaldo_preguntas (encuesta_id, titulo, preguntas)
select id, titulo, preguntas
  from public.encuestas
 where trim(titulo) = 'Encuesta EXCO - 2026';

-- ---------------------------------------------------------------------
-- 3) Las preguntas.
--    Orden: descripción + 6 demográficas + descripción + 42 de la batería
--    + descripción + 5 anclas.
--    Las reglas van dentro de cada pregunta:
--      "condicion"     -> solo se muestra si la respuesta anterior es una de esas
--      "opcionesSegun" -> sus opciones salen de lo que respondieron antes
-- ---------------------------------------------------------------------
update public.encuestas
   set preguntas = $json$
[
  {
    "id": "nota_demograficas",
    "texto": "Primero, unos datos para agrupar los resultados",
    "descripcion": "Con estos datos los resultados se leen por subgerencia, gerencia, rol y región. Nadie ve tus respuestas una por una: el informe siempre se presenta agrupado.",
    "tipo": "nota",
    "obligatoria": false,
    "opciones": [],
    "maxOpciones": 0,
    "escala": {
      "min": 1,
      "max": 5,
      "etiquetaMin": "Totalmente en desacuerdo",
      "etiquetaMax": "Totalmente de acuerdo"
    },
    "textoLargo": true,
    "maxCaracteres": 500,
    "condicion": null,
    "opcionesSegun": null
  },
  {
    "id": "subgerencia",
    "texto": "¿A qué Subgerencia General perteneces?",
    "descripcion": "",
    "tipo": "unica",
    "obligatoria": true,
    "opciones": [
      "Administrativa",
      "Finanzas y Tesorería",
      "Gerencia General",
      "Innovación y Tecnología",
      "Junta Directiva",
      "Negocios",
      "Operaciones",
      "Riesgo y Cumplimiento"
    ],
    "maxOpciones": 0,
    "escala": {
      "min": 1,
      "max": 5,
      "etiquetaMin": "Totalmente en desacuerdo",
      "etiquetaMax": "Totalmente de acuerdo"
    },
    "textoLargo": true,
    "maxCaracteres": 500,
    "condicion": null,
    "opcionesSegun": null
  },
  {
    "id": "gerencia_ejecutiva",
    "texto": "¿A qué Gerencia Ejecutiva perteneces?",
    "descripcion": "",
    "tipo": "unica",
    "obligatoria": true,
    "opciones": [
      "Administración de Crédito y Garantías",
      "Asesoría Legal",
      "Asistencia a la Gerencia General",
      "Auditoría Interna",
      "Banca Agropecuaria",
      "Banca de Personas y PYME",
      "Banca Digital y Medios de Pago",
      "Banca Empresarial",
      "Bienes Adquiridos",
      "Contratos y Soporte al Negocio",
      "Control de Tesorería",
      "Control Interno",
      "Cumplimiento",
      "Experiencia del Cliente",
      "Fideicomisos",
      "Finanzas",
      "Gerencia General",
      "Gestión de Negocios",
      "Gestión Responsable Corporativa",
      "Gobernanza y Gestión de TI",
      "Gobierno Corporativo",
      "Gobierno de Datos",
      "Ingeniería y Mantenimiento",
      "Innovación",
      "Instituciones Financieras y Proyectos Especiales",
      "Mercadeo",
      "Mercado de Capitales",
      "Operaciones",
      "Operaciones del Sistema Financiero",
      "Planificación",
      "Plataformas de Soporte Bancario",
      "Procesos y Mejora Continua",
      "Proyectos de Diseño y Construcción",
      "Recuperación de Créditos",
      "Recursos Humanos",
      "Relaciones con Contrapartes Internacionales",
      "Relaciones con Instituciones Públicas",
      "Riesgo Integral",
      "Secretaría de Junta Directiva",
      "Seguridad",
      "Seguridad de la Información",
      "Servicios Administrativos",
      "Soporte Operativo a Sucursales",
      "Sostenibilidad y Gestión Socioambiental",
      "Subgerencia General Administrativa",
      "Subgerencia General de Finanzas y Tesorería",
      "Subgerencia General de Innovación y Tecnología",
      "Subgerencia General de Negocios",
      "Subgerencia General de Operaciones",
      "Subgerencia General de Riesgo y Cumplimiento",
      "Tecnología de Información",
      "Tesorería e Inversiones"
    ],
    "maxOpciones": 0,
    "escala": {
      "min": 1,
      "max": 5,
      "etiquetaMin": "Totalmente en desacuerdo",
      "etiquetaMax": "Totalmente de acuerdo"
    },
    "textoLargo": true,
    "maxCaracteres": 500,
    "condicion": null,
    "opcionesSegun": {
      "pregunta": "subgerencia",
      "grupos": [
        {
          "cuando": [
            "Administrativa"
          ],
          "opciones": [
            "Asesoría Legal",
            "Bienes Adquiridos",
            "Experiencia del Cliente",
            "Gestión Responsable Corporativa",
            "Ingeniería y Mantenimiento",
            "Mercadeo",
            "Proyectos de Diseño y Construcción",
            "Recursos Humanos",
            "Seguridad",
            "Servicios Administrativos",
            "Subgerencia General Administrativa"
          ]
        },
        {
          "cuando": [
            "Finanzas y Tesorería"
          ],
          "opciones": [
            "Control de Tesorería",
            "Finanzas",
            "Mercado de Capitales",
            "Planificación",
            "Relaciones con Contrapartes Internacionales",
            "Relaciones con Instituciones Públicas",
            "Subgerencia General de Finanzas y Tesorería",
            "Tesorería e Inversiones"
          ]
        },
        {
          "cuando": [
            "Gerencia General"
          ],
          "opciones": [
            "Asistencia a la Gerencia General",
            "Gerencia General"
          ]
        },
        {
          "cuando": [
            "Innovación y Tecnología"
          ],
          "opciones": [
            "Gobernanza y Gestión de TI",
            "Gobierno de Datos",
            "Innovación",
            "Plataformas de Soporte Bancario",
            "Subgerencia General de Innovación y Tecnología",
            "Tecnología de Información"
          ]
        },
        {
          "cuando": [
            "Junta Directiva"
          ],
          "opciones": [
            "Auditoría Interna",
            "Gobierno Corporativo",
            "Secretaría de Junta Directiva"
          ]
        },
        {
          "cuando": [
            "Negocios"
          ],
          "opciones": [
            "Banca Agropecuaria",
            "Banca de Personas y PYME",
            "Banca Digital y Medios de Pago",
            "Banca Empresarial",
            "Contratos y Soporte al Negocio",
            "Fideicomisos",
            "Gestión de Negocios",
            "Instituciones Financieras y Proyectos Especiales",
            "Subgerencia General de Negocios"
          ]
        },
        {
          "cuando": [
            "Operaciones"
          ],
          "opciones": [
            "Operaciones",
            "Operaciones del Sistema Financiero",
            "Procesos y Mejora Continua",
            "Soporte Operativo a Sucursales",
            "Subgerencia General de Operaciones"
          ]
        },
        {
          "cuando": [
            "Riesgo y Cumplimiento"
          ],
          "opciones": [
            "Administración de Crédito y Garantías",
            "Control Interno",
            "Cumplimiento",
            "Recuperación de Créditos",
            "Riesgo Integral",
            "Seguridad de la Información",
            "Sostenibilidad y Gestión Socioambiental",
            "Subgerencia General de Riesgo y Cumplimiento"
          ]
        }
      ]
    }
  },
  {
    "id": "gerencia_area",
    "texto": "¿A qué Gerencia de Área perteneces?",
    "descripcion": "",
    "tipo": "unica",
    "obligatoria": true,
    "opciones": [
      "Administración de Crédito Corporativo",
      "Administración de Crédito de Consumo",
      "Administración de Parámetros",
      "Administración de Personal",
      "Administración y Custodia de Fondos Líquidos",
      "Administración y Venta de Bienes Adquiridos",
      "Administrativa de Relaciones con Instituciones Públicas",
      "Adquirencia",
      "Agropecuaria, Producción y Desarrollo",
      "Análisis de Datos de Cumplimiento",
      "Análisis de Hipotecas de Consumo",
      "Análisis de Mercados Financieros",
      "Análisis de Préstamos Personales y Tarjetas de Crédito",
      "Análisis Económico",
      "Análisis y Aprobación de Crédito Empresarial y Agropecuario - Central",
      "Análisis y Aprobación de Crédito Empresarial y Agropecuario - Metro",
      "Análisis y Aprobación de Crédito Empresarial y Agropecuario - Occidental",
      "Análisis y Control de Inversiones",
      "Analítica y Desarrollo de Machine Learning",
      "Aplicaciones del Sistema Financiero",
      "Aprendizaje y Desarrollo",
      "Aprobación de Crédito de Consumo",
      "Aseguramiento, Calidad y Minería de Datos",
      "Asuntos Jurisdiccionales",
      "Auditoría a Sucursales y Prevención de Blanqueo de Capitales",
      "Auditoría de Operaciones del Sistema Financiero",
      "Auditoría de Sistemas",
      "Auditoría Financiera y Crédito",
      "Automatización de Procesos",
      "Avalúos",
      "Banca Agropecuaria Central",
      "Banca Agropecuaria Metro",
      "Banca Agropecuaria Occidental",
      "Banca Comercial Área Central",
      "Banca Comercial Área Metro",
      "Banca Comercial Área Occidental",
      "Banca Corporativa",
      "Bienestar Corporativo",
      "Calidad Financiera",
      "Casa de Valores",
      "Centro de Contacto y Servicio al Cliente",
      "Ciberseguridad",
      "Compensación y Liquidación de Medios de Pagos",
      "Comunicación Corporativa",
      "Contabilidad",
      "Contrataciones Ley Orgánica",
      "Contrataciones Públicas",
      "Contratos y Soporte al Negocio",
      "Contratos y Soporte al Negocio, Finanzas y Tesorería",
      "Control Tecnológico",
      "Control y Conformidad de TI",
      "Control, Validación, Normativas y Capacitaciones",
      "Core Bancario",
      "Corresponsalía Internacional y Organismos Multilaterales",
      "Créditos Interinos de Construcción",
      "Debida Diligencia Ampliada",
      "Desarrollo Organizacional",
      "Desarrollo Sostenible e Impacto Socioambiental",
      "Estrategia y Gestión de Medios Digitales",
      "Estructuración Financiera",
      "Evaluación de Riesgo de Modelos",
      "Evaluación Financiera",
      "Experiencia del Colaborador",
      "Factoring",
      "Fideicomisos",
      "Gestión Ambiental, Social y Climático",
      "Gestión de Continuidad del Negocio",
      "Gestión de Negocios y Calidad de la Cartera de Banca Agropecuaria",
      "Gestión de Órdenes Judiciales",
      "Gestión de Talento",
      "Gestión Responsable",
      "Gestión y Control Empresarial de Banca Digital",
      "Gestión y Planificación Comercial",
      "Gestión y Soporte de Productos Digitales",
      "Gobierno y Calidad de Datos",
      "Identidades y Administración de Accesos",
      "Información Gerencial",
      "Infraestructura Centralizada",
      "Infraestructura Descentralizada",
      "Ingeniería",
      "Inspecciones y Diseño de Interiores",
      "Instituciones Financieras y Financiamiento de Proyectos",
      "Liquidación de Préstamos",
      "Mantenimiento",
      "Mejora Continua",
      "Mercadeo de Producto",
      "Mercadeo Interno",
      "Monitoreo",
      "Monitoreo de Prácticas de Gobernanza",
      "Monitoreo y Seguridad Electrónica",
      "Negociaciones de Mercados Financieros",
      "Negocios - Metro Este",
      "Negocios Financieros Bancarios",
      "Normativas y Cultura de Seguridad de la Información",
      "Operaciones de Depósitos y Actualización de Datos",
      "Operaciones de Medios de Pago",
      "Operaciones de Tarjetas, Emisión y Adquirencia",
      "Operaciones Internacionales, Tesorería y Programas Digitales",
      "Organización de Eventos",
      "Patrimonio Cultural",
      "Planificación Estratégica",
      "Plataformas de Soporte Bancario",
      "Políticas de Gobierno Corporativo",
      "Portafolio y Presupuesto de TI",
      "Presupuesto",
      "Prevención de Fraude",
      "Prevención y Control",
      "Prevención y Normativa de Operaciones del Sistema Financiero",
      "Prevención y Sanciones",
      "Procesos",
      "Procesos y Gestión de la Experiencia del Cliente",
      "Producción y Logistica",
      "Productos Financieros Internos",
      "Proyecciones y Presupuesto Financiero",
      "Proyectos de Diseño y Construcción",
      "Proyectos de Negocios",
      "Proyectos de Soporte al Negocio",
      "Proyectos Especiales de Negocios",
      "Proyectos Especiales de Tecnología",
      "Proyectos Especiales y Ventas Institucionales",
      "Publicidad",
      "Recepción y Administración de Bienes y Pago a Proveedores",
      "Reclamos y Alertas",
      "Recuperación de Cartera Especial",
      "Recuperación de Créditos Corporativos",
      "Recuperación de Créditos de Consumo",
      "Relación con el Negocio y Gestión de Valor",
      "Relaciones de Negocios Institucionales",
      "Reserva",
      "Revisión de Cartera",
      "Riesgo de Crédito Consumo",
      "Riesgo de Crédito Corporativo",
      "Riesgo de Mercado y Liquidez",
      "Riesgo Operacional",
      "Riesgo Reputacional",
      "Riesgo Tecnológico",
      "Riesgos de Operaciones del Sistema Financiero",
      "Seguridad - Administración de Contratos y Presupuesto",
      "Seguridad - Control Administrativo de Personal",
      "Seguridad - Logística y Mantenimiento de Flota Vehicular",
      "Seguridad Operativa",
      "Seguridad Tecnológica",
      "Seguridad y Protección de la Información",
      "Seguros",
      "Servicio a Instituciones Públicas",
      "Servicios y Continuidad de TI",
      "Soporte Administrativo",
      "Soporte al Negocio de Sucursales",
      "Soporte de Gestión Crediticia",
      "Soporte de Operaciones de Crédito",
      "Soporte de Pagos y Administración de Operaciones",
      "Soporte de Recuperación de Créditos",
      "Soporte Operativo a Sucursales - Área Central y Occidental",
      "Soporte Operativo a Sucursales - Área Metro",
      "Soporte y Control de Tesorería",
      "Sucursales Central",
      "Sucursales Metro 1",
      "Sucursales Metro 2",
      "Sucursales Occidental 1",
      "Sucursales Occidental 2",
      "Trámite y Seguimiento de Hipotecas y PYMES",
      "Transformación Digital",
      "No aplica"
    ],
    "maxOpciones": 0,
    "escala": {
      "min": 1,
      "max": 5,
      "etiquetaMin": "Totalmente en desacuerdo",
      "etiquetaMax": "Totalmente de acuerdo"
    },
    "textoLargo": true,
    "maxCaracteres": 500,
    "condicion": {
      "pregunta": "gerencia_ejecutiva",
      "valores": [
        "Administración de Crédito y Garantías",
        "Asesoría Legal",
        "Auditoría Interna",
        "Banca Agropecuaria",
        "Banca de Personas y PYME",
        "Banca Digital y Medios de Pago",
        "Banca Empresarial",
        "Bienes Adquiridos",
        "Contratos y Soporte al Negocio",
        "Control de Tesorería",
        "Control Interno",
        "Cumplimiento",
        "Experiencia del Cliente",
        "Fideicomisos",
        "Finanzas",
        "Gestión de Negocios",
        "Gestión Responsable Corporativa",
        "Gobernanza y Gestión de TI",
        "Gobierno Corporativo",
        "Gobierno de Datos",
        "Ingeniería y Mantenimiento",
        "Innovación",
        "Instituciones Financieras y Proyectos Especiales",
        "Mercadeo",
        "Mercado de Capitales",
        "Operaciones",
        "Operaciones del Sistema Financiero",
        "Planificación",
        "Plataformas de Soporte Bancario",
        "Procesos y Mejora Continua",
        "Proyectos de Diseño y Construcción",
        "Recuperación de Créditos",
        "Recursos Humanos",
        "Relaciones con Contrapartes Internacionales",
        "Relaciones con Instituciones Públicas",
        "Riesgo Integral",
        "Seguridad",
        "Seguridad de la Información",
        "Servicios Administrativos",
        "Soporte Operativo a Sucursales",
        "Sostenibilidad y Gestión Socioambiental",
        "Subgerencia General de Innovación y Tecnología",
        "Subgerencia General de Negocios",
        "Tecnología de Información",
        "Tesorería e Inversiones"
      ]
    },
    "opcionesSegun": {
      "pregunta": "gerencia_ejecutiva",
      "grupos": [
        {
          "cuando": [
            "Administración de Crédito y Garantías"
          ],
          "opciones": [
            "Administración de Crédito Corporativo",
            "Administración de Crédito de Consumo",
            "Avalúos",
            "Soporte de Gestión Crediticia",
            "No aplica"
          ]
        },
        {
          "cuando": [
            "Asesoría Legal"
          ],
          "opciones": [
            "Asuntos Jurisdiccionales",
            "Contrataciones Ley Orgánica",
            "Gestión de Órdenes Judiciales",
            "No aplica"
          ]
        },
        {
          "cuando": [
            "Asistencia a la Gerencia General"
          ],
          "opciones": [
            "No aplica"
          ]
        },
        {
          "cuando": [
            "Auditoría Interna"
          ],
          "opciones": [
            "Aseguramiento, Calidad y Minería de Datos",
            "Auditoría a Sucursales y Prevención de Blanqueo de Capitales",
            "Auditoría de Operaciones del Sistema Financiero",
            "Auditoría de Sistemas",
            "Auditoría Financiera y Crédito",
            "No aplica"
          ]
        },
        {
          "cuando": [
            "Banca Agropecuaria"
          ],
          "opciones": [
            "Agropecuaria, Producción y Desarrollo",
            "Banca Agropecuaria Central",
            "Banca Agropecuaria Metro",
            "Banca Agropecuaria Occidental",
            "Gestión de Negocios y Calidad de la Cartera de Banca Agropecuaria",
            "Negocios - Metro Este",
            "No aplica"
          ]
        },
        {
          "cuando": [
            "Banca de Personas y PYME"
          ],
          "opciones": [
            "Sucursales Central",
            "Sucursales Metro 1",
            "Sucursales Metro 2",
            "Sucursales Occidental 1",
            "Sucursales Occidental 2",
            "No aplica"
          ]
        },
        {
          "cuando": [
            "Banca Digital y Medios de Pago"
          ],
          "opciones": [
            "Adquirencia",
            "Gestión y Control Empresarial de Banca Digital",
            "Gestión y Planificación Comercial",
            "Gestión y Soporte de Productos Digitales",
            "No aplica"
          ]
        },
        {
          "cuando": [
            "Banca Empresarial"
          ],
          "opciones": [
            "Banca Comercial Área Central",
            "Banca Comercial Área Metro",
            "Banca Comercial Área Occidental",
            "Banca Corporativa",
            "Créditos Interinos de Construcción",
            "Factoring",
            "No aplica"
          ]
        },
        {
          "cuando": [
            "Bienes Adquiridos"
          ],
          "opciones": [
            "Administración y Venta de Bienes Adquiridos",
            "No aplica"
          ]
        },
        {
          "cuando": [
            "Contratos y Soporte al Negocio"
          ],
          "opciones": [
            "Contratos y Soporte al Negocio",
            "Contratos y Soporte al Negocio, Finanzas y Tesorería",
            "No aplica"
          ]
        },
        {
          "cuando": [
            "Control de Tesorería"
          ],
          "opciones": [
            "Análisis y Control de Inversiones",
            "Soporte y Control de Tesorería",
            "No aplica"
          ]
        },
        {
          "cuando": [
            "Control Interno"
          ],
          "opciones": [
            "Control Tecnológico",
            "Prevención y Control",
            "No aplica"
          ]
        },
        {
          "cuando": [
            "Cumplimiento"
          ],
          "opciones": [
            "Análisis de Datos de Cumplimiento",
            "Control, Validación, Normativas y Capacitaciones",
            "Debida Diligencia Ampliada",
            "Monitoreo",
            "Prevención de Fraude",
            "Prevención y Normativa de Operaciones del Sistema Financiero",
            "Prevención y Sanciones",
            "No aplica"
          ]
        },
        {
          "cuando": [
            "Experiencia del Cliente"
          ],
          "opciones": [
            "Centro de Contacto y Servicio al Cliente",
            "Procesos y Gestión de la Experiencia del Cliente",
            "No aplica"
          ]
        },
        {
          "cuando": [
            "Fideicomisos"
          ],
          "opciones": [
            "Fideicomisos",
            "No aplica"
          ]
        },
        {
          "cuando": [
            "Finanzas"
          ],
          "opciones": [
            "Calidad Financiera",
            "Contabilidad",
            "Información Gerencial",
            "Proyecciones y Presupuesto Financiero",
            "No aplica"
          ]
        },
        {
          "cuando": [
            "Gerencia General"
          ],
          "opciones": [
            "No aplica"
          ]
        },
        {
          "cuando": [
            "Gestión de Negocios"
          ],
          "opciones": [
            "Análisis de Hipotecas de Consumo",
            "Análisis de Préstamos Personales y Tarjetas de Crédito",
            "Análisis y Aprobación de Crédito Empresarial y Agropecuario - Central",
            "Análisis y Aprobación de Crédito Empresarial y Agropecuario - Metro",
            "Análisis y Aprobación de Crédito Empresarial y Agropecuario - Occidental",
            "Aprobación de Crédito de Consumo",
            "Soporte al Negocio de Sucursales",
            "Trámite y Seguimiento de Hipotecas y PYMES",
            "No aplica"
          ]
        },
        {
          "cuando": [
            "Gestión Responsable Corporativa"
          ],
          "opciones": [
            "Comunicación Corporativa",
            "Gestión Responsable",
            "Organización de Eventos",
            "Patrimonio Cultural",
            "Producción y Logistica",
            "No aplica"
          ]
        },
        {
          "cuando": [
            "Gobernanza y Gestión de TI"
          ],
          "opciones": [
            "Control y Conformidad de TI",
            "Portafolio y Presupuesto de TI",
            "Servicios y Continuidad de TI",
            "No aplica"
          ]
        },
        {
          "cuando": [
            "Gobierno Corporativo"
          ],
          "opciones": [
            "Monitoreo de Prácticas de Gobernanza",
            "Políticas de Gobierno Corporativo",
            "No aplica"
          ]
        },
        {
          "cuando": [
            "Gobierno de Datos"
          ],
          "opciones": [
            "Analítica y Desarrollo de Machine Learning",
            "Gobierno y Calidad de Datos",
            "No aplica"
          ]
        },
        {
          "cuando": [
            "Ingeniería y Mantenimiento"
          ],
          "opciones": [
            "Ingeniería",
            "Mantenimiento",
            "No aplica"
          ]
        },
        {
          "cuando": [
            "Innovación"
          ],
          "opciones": [
            "Automatización de Procesos",
            "Relación con el Negocio y Gestión de Valor",
            "Transformación Digital",
            "No aplica"
          ]
        },
        {
          "cuando": [
            "Instituciones Financieras y Proyectos Especiales"
          ],
          "opciones": [
            "Estructuración Financiera",
            "Instituciones Financieras y Financiamiento de Proyectos",
            "Proyectos Especiales y Ventas Institucionales",
            "Relaciones de Negocios Institucionales",
            "No aplica"
          ]
        },
        {
          "cuando": [
            "Mercadeo"
          ],
          "opciones": [
            "Estrategia y Gestión de Medios Digitales",
            "Mercadeo de Producto",
            "Mercadeo Interno",
            "Publicidad",
            "No aplica"
          ]
        },
        {
          "cuando": [
            "Mercado de Capitales"
          ],
          "opciones": [
            "Casa de Valores",
            "No aplica"
          ]
        },
        {
          "cuando": [
            "Operaciones"
          ],
          "opciones": [
            "Administración de Parámetros",
            "Liquidación de Préstamos",
            "Operaciones de Depósitos y Actualización de Datos",
            "Operaciones de Medios de Pago",
            "Operaciones de Tarjetas, Emisión y Adquirencia",
            "Operaciones Internacionales, Tesorería y Programas Digitales",
            "Proyectos de Negocios",
            "Proyectos de Soporte al Negocio",
            "Reclamos y Alertas",
            "Soporte de Operaciones de Crédito",
            "Soporte de Pagos y Administración de Operaciones",
            "No aplica"
          ]
        },
        {
          "cuando": [
            "Operaciones del Sistema Financiero"
          ],
          "opciones": [
            "Administración y Custodia de Fondos Líquidos",
            "Compensación y Liquidación de Medios de Pagos",
            "Reserva",
            "No aplica"
          ]
        },
        {
          "cuando": [
            "Planificación"
          ],
          "opciones": [
            "Análisis Económico",
            "Planificación Estratégica",
            "Presupuesto",
            "No aplica"
          ]
        },
        {
          "cuando": [
            "Plataformas de Soporte Bancario"
          ],
          "opciones": [
            "Aplicaciones del Sistema Financiero",
            "Infraestructura Centralizada",
            "Infraestructura Descentralizada",
            "Seguridad Tecnológica",
            "No aplica"
          ]
        },
        {
          "cuando": [
            "Procesos y Mejora Continua"
          ],
          "opciones": [
            "Mejora Continua",
            "Procesos",
            "No aplica"
          ]
        },
        {
          "cuando": [
            "Proyectos de Diseño y Construcción"
          ],
          "opciones": [
            "Inspecciones y Diseño de Interiores",
            "Proyectos de Diseño y Construcción",
            "No aplica"
          ]
        },
        {
          "cuando": [
            "Recuperación de Créditos"
          ],
          "opciones": [
            "Recuperación de Cartera Especial",
            "Recuperación de Créditos Corporativos",
            "Recuperación de Créditos de Consumo",
            "Revisión de Cartera",
            "Soporte de Recuperación de Créditos",
            "No aplica"
          ]
        },
        {
          "cuando": [
            "Recursos Humanos"
          ],
          "opciones": [
            "Administración de Personal",
            "Aprendizaje y Desarrollo",
            "Bienestar Corporativo",
            "Desarrollo Organizacional",
            "Experiencia del Colaborador",
            "Gestión de Talento",
            "Productos Financieros Internos",
            "No aplica"
          ]
        },
        {
          "cuando": [
            "Relaciones con Contrapartes Internacionales"
          ],
          "opciones": [
            "Corresponsalía Internacional y Organismos Multilaterales",
            "No aplica"
          ]
        },
        {
          "cuando": [
            "Relaciones con Instituciones Públicas"
          ],
          "opciones": [
            "Administrativa de Relaciones con Instituciones Públicas",
            "Servicio a Instituciones Públicas",
            "No aplica"
          ]
        },
        {
          "cuando": [
            "Riesgo Integral"
          ],
          "opciones": [
            "Evaluación de Riesgo de Modelos",
            "Evaluación Financiera",
            "Gestión de Continuidad del Negocio",
            "Riesgo de Crédito Consumo",
            "Riesgo de Crédito Corporativo",
            "Riesgo de Mercado y Liquidez",
            "Riesgo Operacional",
            "Riesgo Reputacional",
            "Riesgo Tecnológico",
            "Riesgos de Operaciones del Sistema Financiero",
            "No aplica"
          ]
        },
        {
          "cuando": [
            "Secretaría de Junta Directiva"
          ],
          "opciones": [
            "No aplica"
          ]
        },
        {
          "cuando": [
            "Seguridad"
          ],
          "opciones": [
            "Monitoreo y Seguridad Electrónica",
            "Seguridad - Administración de Contratos y Presupuesto",
            "Seguridad - Control Administrativo de Personal",
            "Seguridad - Logística y Mantenimiento de Flota Vehicular",
            "Seguridad Operativa",
            "No aplica"
          ]
        },
        {
          "cuando": [
            "Seguridad de la Información"
          ],
          "opciones": [
            "Ciberseguridad",
            "Identidades y Administración de Accesos",
            "Normativas y Cultura de Seguridad de la Información",
            "Seguridad y Protección de la Información",
            "No aplica"
          ]
        },
        {
          "cuando": [
            "Servicios Administrativos"
          ],
          "opciones": [
            "Contrataciones Públicas",
            "Recepción y Administración de Bienes y Pago a Proveedores",
            "Seguros",
            "Soporte Administrativo",
            "No aplica"
          ]
        },
        {
          "cuando": [
            "Soporte Operativo a Sucursales"
          ],
          "opciones": [
            "Reclamos y Alertas",
            "Soporte Operativo a Sucursales - Área Central y Occidental",
            "Soporte Operativo a Sucursales - Área Metro",
            "No aplica"
          ]
        },
        {
          "cuando": [
            "Sostenibilidad y Gestión Socioambiental"
          ],
          "opciones": [
            "Desarrollo Sostenible e Impacto Socioambiental",
            "Gestión Ambiental, Social y Climático",
            "No aplica"
          ]
        },
        {
          "cuando": [
            "Subgerencia General Administrativa"
          ],
          "opciones": [
            "No aplica"
          ]
        },
        {
          "cuando": [
            "Subgerencia General de Finanzas y Tesorería"
          ],
          "opciones": [
            "No aplica"
          ]
        },
        {
          "cuando": [
            "Subgerencia General de Innovación y Tecnología"
          ],
          "opciones": [
            "Proyectos Especiales de Tecnología",
            "No aplica"
          ]
        },
        {
          "cuando": [
            "Subgerencia General de Negocios"
          ],
          "opciones": [
            "Proyectos Especiales de Negocios",
            "No aplica"
          ]
        },
        {
          "cuando": [
            "Subgerencia General de Operaciones"
          ],
          "opciones": [
            "No aplica"
          ]
        },
        {
          "cuando": [
            "Subgerencia General de Riesgo y Cumplimiento"
          ],
          "opciones": [
            "No aplica"
          ]
        },
        {
          "cuando": [
            "Tecnología de Información"
          ],
          "opciones": [
            "Core Bancario",
            "Plataformas de Soporte Bancario",
            "No aplica"
          ]
        },
        {
          "cuando": [
            "Tesorería e Inversiones"
          ],
          "opciones": [
            "Análisis de Mercados Financieros",
            "Negociaciones de Mercados Financieros",
            "Negocios Financieros Bancarios",
            "No aplica"
          ]
        }
      ]
    }
  },
  {
    "id": "rol_agrupador",
    "texto": "¿Cuál es tu rol?",
    "descripcion": "Elige el grupo que mejor describe tu cargo.",
    "tipo": "unica",
    "obligatoria": true,
    "opciones": [
      "Administrativos",
      "Analistas",
      "Asistentes",
      "Asistentes a Gerentes",
      "Asistentes Ejecutivos",
      "Auxiliar",
      "Cajeros",
      "Conductores",
      "Coordinadores",
      "Diseñadores",
      "Especialistas",
      "Gerente General",
      "Gerentes",
      "Gerentes de Área",
      "Gerentes Ejecutivos",
      "Inspector de Seguridad",
      "Jefes de Departamentos",
      "Jefes de Sección",
      "Mensajero",
      "Oficiales",
      "Oficiales Senior",
      "Oficinistas",
      "Profesor / Auxiliar",
      "Subgerente Ejecutivo",
      "Subgerentes Generales",
      "Supervisores",
      "Técnicos"
    ],
    "maxOpciones": 0,
    "escala": {
      "min": 1,
      "max": 5,
      "etiquetaMin": "Totalmente en desacuerdo",
      "etiquetaMax": "Totalmente de acuerdo"
    },
    "textoLargo": true,
    "maxCaracteres": 500,
    "condicion": null,
    "opcionesSegun": null
  },
  {
    "id": "region",
    "texto": "¿En qué región trabajas?",
    "descripcion": "",
    "tipo": "unica",
    "obligatoria": true,
    "opciones": [
      "Central",
      "Metro",
      "Occidental"
    ],
    "maxOpciones": 0,
    "escala": {
      "min": 1,
      "max": 5,
      "etiquetaMin": "Totalmente en desacuerdo",
      "etiquetaMax": "Totalmente de acuerdo"
    },
    "textoLargo": true,
    "maxCaracteres": 500,
    "condicion": null,
    "opcionesSegun": null
  },
  {
    "id": "lugar_trabajo",
    "texto": "¿Cuál es tu lugar de trabajo?",
    "descripcion": "",
    "tipo": "unica",
    "obligatoria": true,
    "opciones": [
      "12 de Octubre",
      "24 de Diciembre",
      "4 Altos",
      "Agencia Órgano Judicial",
      "Agencia Registro Público",
      "Aguadulce",
      "Alanje",
      "Almirante",
      "Anclas Mall",
      "Antón",
      "Balboa",
      "Belén",
      "Bocas del Toro (Isla Colón)",
      "Boquerón",
      "Boquete",
      "Brisas del Glof",
      "C.A.I.P.I.",
      "Calidonia",
      "Cañazas",
      "Capira",
      "Casa Matriz",
      "Casa Museo",
      "Chame",
      "Changuinola",
      "Chanis",
      "Chepo",
      "Chiriquí Grande",
      "Chitré",
      "Chitré Circunvalación",
      "Chorrera",
      "Chorrera OnDGo",
      "Colón",
      "Complejo Deportivo",
      "Concepción",
      "Coronado",
      "Costa Abajo de Colón",
      "David",
      "Divisa",
      "Dolega",
      "Doleguita",
      "Edificio 12 de Octubre",
      "Edificio Balboa",
      "Edificio Casa Matriz",
      "Edificio Circunvalación Chitré Área Administrativa",
      "Edificio Cobros (Occidente)",
      "EDIFICIO DAVID (OCCIDENTE)",
      "Edificio Doleguita",
      "Edificio Fito Moreno",
      "Edificio Marriott Finisterre",
      "Edificio Regional de Chitré",
      "Edificio Registro Público Chitré",
      "Edificio Transistmica",
      "El Carmen (David)",
      "El Dorado",
      "El Valle",
      "Garita de Chitré",
      "Garita La Arena",
      "Gran Terminal",
      "Guabito",
      "Gualaca",
      "Guna Yala",
      "Hatillo",
      "Imprenta",
      "La Arena",
      "La Exposición",
      "La Palma (Darién)",
      "La Pintada",
      "Las Cumbres",
      "Las Minas",
      "Las Palmas",
      "Las Tablas",
      "Los Pozos",
      "Los Pueblos",
      "Los Santos",
      "Macaracas",
      "Mariato",
      "Metetí",
      "Metro Este",
      "Milla 8",
      "Natá",
      "Nuevo Arraiján",
      "Ocú",
      "Oficinas Administrativa - Finisterre",
      "Oficinas Administrativa - Parque Sur",
      "Oficinas Administrativas - Milla 8",
      "Oficinas Administrativas - San Francisco",
      "Oficinas Administrativas - Versalles",
      "Oficinas Administrativas La Arena",
      "Oficinas Administrativas- La Reserva",
      "Panamá Pacífico",
      "Paraiso",
      "Parita",
      "Paso Canoa",
      "Pedasí",
      "Pedregal",
      "Penonomé",
      "Penonomé Panamericana",
      "Pesé",
      "Plaza Banconal",
      "Plaza Edison",
      "Puerto Armuelles",
      "Rambala",
      "Registro Público David",
      "Río Abajo",
      "Río Hato",
      "Río Sereno",
      "Sabanitas",
      "San Carlos",
      "San Félix",
      "San Fernando",
      "San Francisco",
      "San Francisco de la Montaña",
      "Santiago",
      "Septima Central",
      "Soná",
      "Suministro",
      "Taller de Mantenimiento (San Miguelito)",
      "Tocumen",
      "Tocumen Carga",
      "Tonosí",
      "Tortí",
      "Town Center",
      "Transistmica",
      "Versalles",
      "Villa Lucre",
      "Volcán",
      "Zona Libre"
    ],
    "maxOpciones": 0,
    "escala": {
      "min": 1,
      "max": 5,
      "etiquetaMin": "Totalmente en desacuerdo",
      "etiquetaMax": "Totalmente de acuerdo"
    },
    "textoLargo": true,
    "maxCaracteres": 500,
    "condicion": null,
    "opcionesSegun": {
      "pregunta": "region",
      "grupos": [
        {
          "cuando": [
            "Central"
          ],
          "opciones": [
            "Aguadulce",
            "Antón",
            "Cañazas",
            "Chitré",
            "Chitré Circunvalación",
            "Divisa",
            "Edificio Circunvalación Chitré Área Administrativa",
            "Edificio Doleguita",
            "Edificio Fito Moreno",
            "Edificio Regional de Chitré",
            "Edificio Registro Público Chitré",
            "Edificio Transistmica",
            "El Valle",
            "Garita de Chitré",
            "Garita La Arena",
            "La Arena",
            "La Pintada",
            "Las Minas",
            "Las Palmas",
            "Las Tablas",
            "Los Pozos",
            "Los Santos",
            "Macaracas",
            "Mariato",
            "Natá",
            "Ocú",
            "Oficinas Administrativas La Arena",
            "Parita",
            "Pedasí",
            "Penonomé",
            "Penonomé Panamericana",
            "Pesé",
            "Plaza Banconal",
            "Río Hato",
            "San Francisco de la Montaña",
            "Santiago",
            "Soná",
            "Tonosí"
          ]
        },
        {
          "cuando": [
            "Metro"
          ],
          "opciones": [
            "12 de Octubre",
            "24 de Diciembre",
            "4 Altos",
            "Agencia Órgano Judicial",
            "Agencia Registro Público",
            "Aguadulce",
            "Anclas Mall",
            "Antón",
            "Balboa",
            "Belén",
            "Brisas del Glof",
            "C.A.I.P.I.",
            "Calidonia",
            "Capira",
            "Casa Matriz",
            "Casa Museo",
            "Chame",
            "Chanis",
            "Chepo",
            "Chitré Circunvalación",
            "Chorrera",
            "Chorrera OnDGo",
            "Colón",
            "Complejo Deportivo",
            "Coronado",
            "Costa Abajo de Colón",
            "David",
            "Divisa",
            "Edificio 12 de Octubre",
            "Edificio Balboa",
            "Edificio Casa Matriz",
            "Edificio Circunvalación Chitré Área Administrativa",
            "Edificio Cobros (Occidente)",
            "EDIFICIO DAVID (OCCIDENTE)",
            "Edificio Doleguita",
            "Edificio Fito Moreno",
            "Edificio Marriott Finisterre",
            "Edificio Regional de Chitré",
            "Edificio Transistmica",
            "El Dorado",
            "Garita de Chitré",
            "Gran Terminal",
            "Guna Yala",
            "Hatillo",
            "Imprenta",
            "La Exposición",
            "La Palma (Darién)",
            "Las Cumbres",
            "Las Tablas",
            "Los Pueblos",
            "Los Santos",
            "Metetí",
            "Metro Este",
            "Milla 8",
            "Nuevo Arraiján",
            "Oficinas Administrativa - Finisterre",
            "Oficinas Administrativa - Parque Sur",
            "Oficinas Administrativas - Milla 8",
            "Oficinas Administrativas - San Francisco",
            "Oficinas Administrativas - Versalles",
            "Oficinas Administrativas La Arena",
            "Oficinas Administrativas- La Reserva",
            "Panamá Pacífico",
            "Paraiso",
            "Pedregal",
            "Penonomé",
            "Penonomé Panamericana",
            "Plaza Banconal",
            "Plaza Edison",
            "Río Abajo",
            "Sabanitas",
            "San Carlos",
            "San Fernando",
            "San Francisco",
            "Santiago",
            "Septima Central",
            "Suministro",
            "Taller de Mantenimiento (San Miguelito)",
            "Tocumen",
            "Tocumen Carga",
            "Tortí",
            "Town Center",
            "Transistmica",
            "Versalles",
            "Villa Lucre",
            "Volcán",
            "Zona Libre"
          ]
        },
        {
          "cuando": [
            "Occidental"
          ],
          "opciones": [
            "Alanje",
            "Almirante",
            "Bocas del Toro (Isla Colón)",
            "Boquerón",
            "Boquete",
            "Cañazas",
            "Changuinola",
            "Chiriquí Grande",
            "Concepción",
            "David",
            "Dolega",
            "Doleguita",
            "Edificio Cobros (Occidente)",
            "EDIFICIO DAVID (OCCIDENTE)",
            "Edificio Doleguita",
            "El Carmen (David)",
            "Guabito",
            "Gualaca",
            "Las Palmas",
            "Paso Canoa",
            "Plaza Banconal",
            "Puerto Armuelles",
            "Rambala",
            "Registro Público David",
            "Río Sereno",
            "San Félix",
            "San Francisco de la Montaña",
            "Volcán"
          ]
        }
      ]
    }
  },
  {
    "id": "nota_escala",
    "texto": "Ahora, sobre tu experiencia en Banconal",
    "descripcion": "Para cada afirmación, elige un número de 0 a 10: 0 es «totalmente en desacuerdo» y 10 es «totalmente de acuerdo». Responde según lo que vives hoy, no según lo que debería ser.",
    "tipo": "nota",
    "obligatoria": false,
    "opciones": [],
    "maxOpciones": 0,
    "escala": {
      "min": 1,
      "max": 5,
      "etiquetaMin": "Totalmente en desacuerdo",
      "etiquetaMax": "Totalmente de acuerdo"
    },
    "textoLargo": true,
    "maxCaracteres": 500,
    "condicion": null,
    "opcionesSegun": null
  },
  {
    "id": "marca_1",
    "texto": "Me siento orgulloso/a de decir que trabajo en Banconal.",
    "descripcion": "",
    "tipo": "escala",
    "obligatoria": true,
    "opciones": [],
    "maxOpciones": 0,
    "escala": {
      "min": 0,
      "max": 10,
      "etiquetaMin": "Totalmente en desacuerdo",
      "etiquetaMax": "Totalmente de acuerdo"
    },
    "textoLargo": true,
    "maxCaracteres": 500,
    "condicion": null,
    "opcionesSegun": null
  },
  {
    "id": "marca_2",
    "texto": "La reputación de Banconal como empleador/a coincide con mi experiencia como colaborador/a.",
    "descripcion": "",
    "tipo": "escala",
    "obligatoria": true,
    "opciones": [],
    "maxOpciones": 0,
    "escala": {
      "min": 0,
      "max": 10,
      "etiquetaMin": "Totalmente en desacuerdo",
      "etiquetaMax": "Totalmente de acuerdo"
    },
    "textoLargo": true,
    "maxCaracteres": 500,
    "condicion": null,
    "opcionesSegun": null
  },
  {
    "id": "marca_3",
    "texto": "Banconal ofrece una propuesta de valor atractiva para desarrollar mi carrera.",
    "descripcion": "",
    "tipo": "escala",
    "obligatoria": true,
    "opciones": [],
    "maxOpciones": 0,
    "escala": {
      "min": 0,
      "max": 10,
      "etiquetaMin": "Totalmente en desacuerdo",
      "etiquetaMax": "Totalmente de acuerdo"
    },
    "textoLargo": true,
    "maxCaracteres": 500,
    "condicion": null,
    "opcionesSegun": null
  },
  {
    "id": "marca_4",
    "texto": "La experiencia que vivo en Banconal cumple con lo que se me prometió al ingresar.",
    "descripcion": "",
    "tipo": "escala",
    "obligatoria": true,
    "opciones": [],
    "maxOpciones": 0,
    "escala": {
      "min": 0,
      "max": 10,
      "etiquetaMin": "Totalmente en desacuerdo",
      "etiquetaMax": "Totalmente de acuerdo"
    },
    "textoLargo": true,
    "maxCaracteres": 500,
    "condicion": null,
    "opcionesSegun": null
  },
  {
    "id": "clima_1",
    "texto": "Tengo las herramientas y sistemas necesarios para hacer mi trabajo con eficiencia.",
    "descripcion": "",
    "tipo": "escala",
    "obligatoria": true,
    "opciones": [],
    "maxOpciones": 0,
    "escala": {
      "min": 0,
      "max": 10,
      "etiquetaMin": "Totalmente en desacuerdo",
      "etiquetaMax": "Totalmente de acuerdo"
    },
    "textoLargo": true,
    "maxCaracteres": 500,
    "condicion": null,
    "opcionesSegun": null
  },
  {
    "id": "clima_2",
    "texto": "Los espacios/instalaciones (puestos, salas, servicios, estacionamientos) apoyan mi desempeño.",
    "descripcion": "",
    "tipo": "escala",
    "obligatoria": true,
    "opciones": [],
    "maxOpciones": 0,
    "escala": {
      "min": 0,
      "max": 10,
      "etiquetaMin": "Totalmente en desacuerdo",
      "etiquetaMax": "Totalmente de acuerdo"
    },
    "textoLargo": true,
    "maxCaracteres": 500,
    "condicion": null,
    "opcionesSegun": null
  },
  {
    "id": "clima_3",
    "texto": "Los procesos internos me permiten realizar mi trabajo sin reprocesos innecesarios.",
    "descripcion": "",
    "tipo": "escala",
    "obligatoria": true,
    "opciones": [],
    "maxOpciones": 0,
    "escala": {
      "min": 0,
      "max": 10,
      "etiquetaMin": "Totalmente en desacuerdo",
      "etiquetaMax": "Totalmente de acuerdo"
    },
    "textoLargo": true,
    "maxCaracteres": 500,
    "condicion": null,
    "opcionesSegun": null
  },
  {
    "id": "clima_4",
    "texto": "La comunicación corporativa me llega clara y a tiempo (cambios, manuales, procedimientos, beneficios).",
    "descripcion": "",
    "tipo": "escala",
    "obligatoria": true,
    "opciones": [],
    "maxOpciones": 0,
    "escala": {
      "min": 0,
      "max": 10,
      "etiquetaMin": "Totalmente en desacuerdo",
      "etiquetaMax": "Totalmente de acuerdo"
    },
    "textoLargo": true,
    "maxCaracteres": 500,
    "condicion": null,
    "opcionesSegun": null
  },
  {
    "id": "clima_5",
    "texto": "Los trámites internos facilitan la realización de mi trabajo.",
    "descripcion": "",
    "tipo": "escala",
    "obligatoria": true,
    "opciones": [],
    "maxOpciones": 0,
    "escala": {
      "min": 0,
      "max": 10,
      "etiquetaMin": "Totalmente en desacuerdo",
      "etiquetaMax": "Totalmente de acuerdo"
    },
    "textoLargo": true,
    "maxCaracteres": 500,
    "condicion": null,
    "opcionesSegun": null
  },
  {
    "id": "clima_6",
    "texto": "En general, mi entorno laboral me permite rendir sin fricciones evitables.",
    "descripcion": "",
    "tipo": "escala",
    "obligatoria": true,
    "opciones": [],
    "maxOpciones": 0,
    "escala": {
      "min": 0,
      "max": 10,
      "etiquetaMin": "Totalmente en desacuerdo",
      "etiquetaMax": "Totalmente de acuerdo"
    },
    "textoLargo": true,
    "maxCaracteres": 500,
    "condicion": null,
    "opcionesSegun": null
  },
  {
    "id": "bienestar_1",
    "texto": "Puedo equilibrar adecuadamente mi vida laboral y personal.",
    "descripcion": "",
    "tipo": "escala",
    "obligatoria": true,
    "opciones": [],
    "maxOpciones": 0,
    "escala": {
      "min": 0,
      "max": 10,
      "etiquetaMin": "Totalmente en desacuerdo",
      "etiquetaMax": "Totalmente de acuerdo"
    },
    "textoLargo": true,
    "maxCaracteres": 500,
    "condicion": null,
    "opcionesSegun": null
  },
  {
    "id": "bienestar_2",
    "texto": "Mi carga de trabajo es sostenible en el tiempo.",
    "descripcion": "",
    "tipo": "escala",
    "obligatoria": true,
    "opciones": [],
    "maxOpciones": 0,
    "escala": {
      "min": 0,
      "max": 10,
      "etiquetaMin": "Totalmente en desacuerdo",
      "etiquetaMax": "Totalmente de acuerdo"
    },
    "textoLargo": true,
    "maxCaracteres": 500,
    "condicion": null,
    "opcionesSegun": null
  },
  {
    "id": "bienestar_3",
    "texto": "Puedo tomar vacaciones/licencias/permisos sin fricciones excesivas.",
    "descripcion": "",
    "tipo": "escala",
    "obligatoria": true,
    "opciones": [],
    "maxOpciones": 0,
    "escala": {
      "min": 0,
      "max": 10,
      "etiquetaMin": "Totalmente en desacuerdo",
      "etiquetaMax": "Totalmente de acuerdo"
    },
    "textoLargo": true,
    "maxCaracteres": 500,
    "condicion": null,
    "opcionesSegun": null
  },
  {
    "id": "bienestar_4",
    "texto": "Puedo desconectarme del trabajo fuera de mi horario laboral.",
    "descripcion": "",
    "tipo": "escala",
    "obligatoria": true,
    "opciones": [],
    "maxOpciones": 0,
    "escala": {
      "min": 0,
      "max": 10,
      "etiquetaMin": "Totalmente en desacuerdo",
      "etiquetaMax": "Totalmente de acuerdo"
    },
    "textoLargo": true,
    "maxCaracteres": 500,
    "condicion": null,
    "opcionesSegun": null
  },
  {
    "id": "bienestar_5",
    "texto": "Considero que mi salario es competitivo.",
    "descripcion": "",
    "tipo": "escala",
    "obligatoria": true,
    "opciones": [],
    "maxOpciones": 0,
    "escala": {
      "min": 0,
      "max": 10,
      "etiquetaMin": "Totalmente en desacuerdo",
      "etiquetaMax": "Totalmente de acuerdo"
    },
    "textoLargo": true,
    "maxCaracteres": 500,
    "condicion": null,
    "opcionesSegun": null
  },
  {
    "id": "bienestar_6",
    "texto": "Considero que mi salario es justo para mi rol y responsabilidades.",
    "descripcion": "",
    "tipo": "escala",
    "obligatoria": true,
    "opciones": [],
    "maxOpciones": 0,
    "escala": {
      "min": 0,
      "max": 10,
      "etiquetaMin": "Totalmente en desacuerdo",
      "etiquetaMax": "Totalmente de acuerdo"
    },
    "textoLargo": true,
    "maxCaracteres": 500,
    "condicion": null,
    "opcionesSegun": null
  },
  {
    "id": "bienestar_7",
    "texto": "La bonificación (si aplica) tiene criterios claros y se percibe justa.",
    "descripcion": "",
    "tipo": "escala",
    "obligatoria": true,
    "opciones": [],
    "maxOpciones": 0,
    "escala": {
      "min": 0,
      "max": 10,
      "etiquetaMin": "Totalmente en desacuerdo",
      "etiquetaMax": "Totalmente de acuerdo"
    },
    "textoLargo": true,
    "maxCaracteres": 500,
    "condicion": null,
    "opcionesSegun": null
  },
  {
    "id": "bienestar_8",
    "texto": "Los beneficios disponibles son accesibles y contribuyen a mi bienestar.",
    "descripcion": "",
    "tipo": "escala",
    "obligatoria": true,
    "opciones": [],
    "maxOpciones": 0,
    "escala": {
      "min": 0,
      "max": 10,
      "etiquetaMin": "Totalmente en desacuerdo",
      "etiquetaMax": "Totalmente de acuerdo"
    },
    "textoLargo": true,
    "maxCaracteres": 500,
    "condicion": null,
    "opcionesSegun": null
  },
  {
    "id": "bienestar_9",
    "texto": "Puedo acceder fácilmente a los productos financieros disponibles para colaboradores.",
    "descripcion": "",
    "tipo": "escala",
    "obligatoria": true,
    "opciones": [],
    "maxOpciones": 0,
    "escala": {
      "min": 0,
      "max": 10,
      "etiquetaMin": "Totalmente en desacuerdo",
      "etiquetaMax": "Totalmente de acuerdo"
    },
    "textoLargo": true,
    "maxCaracteres": 500,
    "condicion": null,
    "opcionesSegun": null
  },
  {
    "id": "cultura_1",
    "texto": "En Banconal se vive una cultura de respeto y trato digno.",
    "descripcion": "",
    "tipo": "escala",
    "obligatoria": true,
    "opciones": [],
    "maxOpciones": 0,
    "escala": {
      "min": 0,
      "max": 10,
      "etiquetaMin": "Totalmente en desacuerdo",
      "etiquetaMax": "Totalmente de acuerdo"
    },
    "textoLargo": true,
    "maxCaracteres": 500,
    "condicion": null,
    "opcionesSegun": null
  },
  {
    "id": "cultura_2",
    "texto": "Se promueve la ética y el cumplimiento como formas de trabajar (no solo como discurso).",
    "descripcion": "",
    "tipo": "escala",
    "obligatoria": true,
    "opciones": [],
    "maxOpciones": 0,
    "escala": {
      "min": 0,
      "max": 10,
      "etiquetaMin": "Totalmente en desacuerdo",
      "etiquetaMax": "Totalmente de acuerdo"
    },
    "textoLargo": true,
    "maxCaracteres": 500,
    "condicion": null,
    "opcionesSegun": null
  },
  {
    "id": "cultura_3",
    "texto": "Las decisiones que afectan a las personas se comunican con claridad y transparencia.",
    "descripcion": "",
    "tipo": "escala",
    "obligatoria": true,
    "opciones": [],
    "maxOpciones": 0,
    "escala": {
      "min": 0,
      "max": 10,
      "etiquetaMin": "Totalmente en desacuerdo",
      "etiquetaMax": "Totalmente de acuerdo"
    },
    "textoLargo": true,
    "maxCaracteres": 500,
    "condicion": null,
    "opcionesSegun": null
  },
  {
    "id": "cultura_4",
    "texto": "Las oportunidades de crecimiento se asignan con base en el mérito.",
    "descripcion": "",
    "tipo": "escala",
    "obligatoria": true,
    "opciones": [],
    "maxOpciones": 0,
    "escala": {
      "min": 0,
      "max": 10,
      "etiquetaMin": "Totalmente en desacuerdo",
      "etiquetaMax": "Totalmente de acuerdo"
    },
    "textoLargo": true,
    "maxCaracteres": 500,
    "condicion": null,
    "opcionesSegun": null
  },
  {
    "id": "cultura_5",
    "texto": "Se reconoce el esfuerzo y los resultados de manera consistente.",
    "descripcion": "",
    "tipo": "escala",
    "obligatoria": true,
    "opciones": [],
    "maxOpciones": 0,
    "escala": {
      "min": 0,
      "max": 10,
      "etiquetaMin": "Totalmente en desacuerdo",
      "etiquetaMax": "Totalmente de acuerdo"
    },
    "textoLargo": true,
    "maxCaracteres": 500,
    "condicion": null,
    "opcionesSegun": null
  },
  {
    "id": "cultura_6",
    "texto": "Se fomenta el aprendizaje (técnico y habilidades blandas) como parte de la forma de trabajar.",
    "descripcion": "",
    "tipo": "escala",
    "obligatoria": true,
    "opciones": [],
    "maxOpciones": 0,
    "escala": {
      "min": 0,
      "max": 10,
      "etiquetaMin": "Totalmente en desacuerdo",
      "etiquetaMax": "Totalmente de acuerdo"
    },
    "textoLargo": true,
    "maxCaracteres": 500,
    "condicion": null,
    "opcionesSegun": null
  },
  {
    "id": "cultura_7",
    "texto": "Tengo acceso a oportunidades de crecimiento y movilidad interna mediante procesos claros y justos.",
    "descripcion": "",
    "tipo": "escala",
    "obligatoria": true,
    "opciones": [],
    "maxOpciones": 0,
    "escala": {
      "min": 0,
      "max": 10,
      "etiquetaMin": "Totalmente en desacuerdo",
      "etiquetaMax": "Totalmente de acuerdo"
    },
    "textoLargo": true,
    "maxCaracteres": 500,
    "condicion": null,
    "opcionesSegun": null
  },
  {
    "id": "liderazgo_1",
    "texto": "Mi jefe/a aclara expectativas y prioridades para que yo pueda desempeñarme bien.",
    "descripcion": "",
    "tipo": "escala",
    "obligatoria": true,
    "opciones": [],
    "maxOpciones": 0,
    "escala": {
      "min": 0,
      "max": 10,
      "etiquetaMin": "Totalmente en desacuerdo",
      "etiquetaMax": "Totalmente de acuerdo"
    },
    "textoLargo": true,
    "maxCaracteres": 500,
    "condicion": null,
    "opcionesSegun": null
  },
  {
    "id": "liderazgo_2",
    "texto": "Mi jefe/a me brinda retroalimentación útil y oportuna (no solo en evaluaciones formales).",
    "descripcion": "",
    "tipo": "escala",
    "obligatoria": true,
    "opciones": [],
    "maxOpciones": 0,
    "escala": {
      "min": 0,
      "max": 10,
      "etiquetaMin": "Totalmente en desacuerdo",
      "etiquetaMax": "Totalmente de acuerdo"
    },
    "textoLargo": true,
    "maxCaracteres": 500,
    "condicion": null,
    "opcionesSegun": null
  },
  {
    "id": "liderazgo_3",
    "texto": "Mi jefe/a facilita recursos y elimina obstáculos para que el equipo cumpla metas.",
    "descripcion": "",
    "tipo": "escala",
    "obligatoria": true,
    "opciones": [],
    "maxOpciones": 0,
    "escala": {
      "min": 0,
      "max": 10,
      "etiquetaMin": "Totalmente en desacuerdo",
      "etiquetaMax": "Totalmente de acuerdo"
    },
    "textoLargo": true,
    "maxCaracteres": 500,
    "condicion": null,
    "opcionesSegun": null
  },
  {
    "id": "liderazgo_4",
    "texto": "Mi jefe/a reconoce el buen desempeño de forma concreta y justa.",
    "descripcion": "",
    "tipo": "escala",
    "obligatoria": true,
    "opciones": [],
    "maxOpciones": 0,
    "escala": {
      "min": 0,
      "max": 10,
      "etiquetaMin": "Totalmente en desacuerdo",
      "etiquetaMax": "Totalmente de acuerdo"
    },
    "textoLargo": true,
    "maxCaracteres": 500,
    "condicion": null,
    "opcionesSegun": null
  },
  {
    "id": "liderazgo_5",
    "texto": "El feedback que recibo de mi jefe/a se basa en lineamientos establecidos por Banconal, independientemente de su estilo personal.",
    "descripcion": "",
    "tipo": "escala",
    "obligatoria": true,
    "opciones": [],
    "maxOpciones": 0,
    "escala": {
      "min": 0,
      "max": 10,
      "etiquetaMin": "Totalmente en desacuerdo",
      "etiquetaMax": "Totalmente de acuerdo"
    },
    "textoLargo": true,
    "maxCaracteres": 500,
    "condicion": null,
    "opcionesSegun": null
  },
  {
    "id": "liderazgo_6",
    "texto": "Las evaluaciones del desempeño se realizan con criterios claros.",
    "descripcion": "",
    "tipo": "escala",
    "obligatoria": true,
    "opciones": [],
    "maxOpciones": 0,
    "escala": {
      "min": 0,
      "max": 10,
      "etiquetaMin": "Totalmente en desacuerdo",
      "etiquetaMax": "Totalmente de acuerdo"
    },
    "textoLargo": true,
    "maxCaracteres": 500,
    "condicion": null,
    "opcionesSegun": null
  },
  {
    "id": "liderazgo_7",
    "texto": "Me siento seguro/a para hablar con mi jefe/a sobre riesgos, errores o situaciones que afectan mi trabajo.",
    "descripcion": "",
    "tipo": "escala",
    "obligatoria": true,
    "opciones": [],
    "maxOpciones": 0,
    "escala": {
      "min": 0,
      "max": 10,
      "etiquetaMin": "Totalmente en desacuerdo",
      "etiquetaMax": "Totalmente de acuerdo"
    },
    "textoLargo": true,
    "maxCaracteres": 500,
    "condicion": null,
    "opcionesSegun": null
  },
  {
    "id": "liderazgo_8",
    "texto": "Mi jefe/a me motiva a participar en oportunidades de crecimiento y movilidad interna.",
    "descripcion": "",
    "tipo": "escala",
    "obligatoria": true,
    "opciones": [],
    "maxOpciones": 0,
    "escala": {
      "min": 0,
      "max": 10,
      "etiquetaMin": "Totalmente en desacuerdo",
      "etiquetaMax": "Totalmente de acuerdo"
    },
    "textoLargo": true,
    "maxCaracteres": 500,
    "condicion": null,
    "opcionesSegun": null
  },
  {
    "id": "liderazgo_9",
    "texto": "Mi jefe/a facilita mi participación en oportunidades de movilidad interna cuando cumplo con los requisitos establecidos.",
    "descripcion": "",
    "tipo": "escala",
    "obligatoria": true,
    "opciones": [],
    "maxOpciones": 0,
    "escala": {
      "min": 0,
      "max": 10,
      "etiquetaMin": "Totalmente en desacuerdo",
      "etiquetaMax": "Totalmente de acuerdo"
    },
    "textoLargo": true,
    "maxCaracteres": 500,
    "condicion": null,
    "opcionesSegun": null
  },
  {
    "id": "colaboracion_1",
    "texto": "En mi equipo hay compañerismo y apoyo mutuo.",
    "descripcion": "",
    "tipo": "escala",
    "obligatoria": true,
    "opciones": [],
    "maxOpciones": 0,
    "escala": {
      "min": 0,
      "max": 10,
      "etiquetaMin": "Totalmente en desacuerdo",
      "etiquetaMax": "Totalmente de acuerdo"
    },
    "textoLargo": true,
    "maxCaracteres": 500,
    "condicion": null,
    "opcionesSegun": null
  },
  {
    "id": "colaboracion_2",
    "texto": "Compartimos información y buenas prácticas para trabajar mejor.",
    "descripcion": "",
    "tipo": "escala",
    "obligatoria": true,
    "opciones": [],
    "maxOpciones": 0,
    "escala": {
      "min": 0,
      "max": 10,
      "etiquetaMin": "Totalmente en desacuerdo",
      "etiquetaMax": "Totalmente de acuerdo"
    },
    "textoLargo": true,
    "maxCaracteres": 500,
    "condicion": null,
    "opcionesSegun": null
  },
  {
    "id": "colaboracion_3",
    "texto": "Las responsabilidades y entregables entre equipos están claros (evita reprocesos).",
    "descripcion": "",
    "tipo": "escala",
    "obligatoria": true,
    "opciones": [],
    "maxOpciones": 0,
    "escala": {
      "min": 0,
      "max": 10,
      "etiquetaMin": "Totalmente en desacuerdo",
      "etiquetaMax": "Totalmente de acuerdo"
    },
    "textoLargo": true,
    "maxCaracteres": 500,
    "condicion": null,
    "opcionesSegun": null
  },
  {
    "id": "colaboracion_4",
    "texto": "Recibo respuesta oportuna cuando solicito apoyo a otras áreas.",
    "descripcion": "",
    "tipo": "escala",
    "obligatoria": true,
    "opciones": [],
    "maxOpciones": 0,
    "escala": {
      "min": 0,
      "max": 10,
      "etiquetaMin": "Totalmente en desacuerdo",
      "etiquetaMax": "Totalmente de acuerdo"
    },
    "textoLargo": true,
    "maxCaracteres": 500,
    "condicion": null,
    "opcionesSegun": null
  },
  {
    "id": "colaboracion_5",
    "texto": "Existe suficiente colaboración entre las diferentes áreas para resolver problemas y atender las necesidades de clientes internos y externos.",
    "descripcion": "",
    "tipo": "escala",
    "obligatoria": true,
    "opciones": [],
    "maxOpciones": 0,
    "escala": {
      "min": 0,
      "max": 10,
      "etiquetaMin": "Totalmente en desacuerdo",
      "etiquetaMax": "Totalmente de acuerdo"
    },
    "textoLargo": true,
    "maxCaracteres": 500,
    "condicion": null,
    "opcionesSegun": null
  },
  {
    "id": "colaboracion_6",
    "texto": "Existen espacios efectivos para coordinar trabajo entre áreas (reuniones útiles, acuerdos, seguimiento).",
    "descripcion": "",
    "tipo": "escala",
    "obligatoria": true,
    "opciones": [],
    "maxOpciones": 0,
    "escala": {
      "min": 0,
      "max": 10,
      "etiquetaMin": "Totalmente en desacuerdo",
      "etiquetaMax": "Totalmente de acuerdo"
    },
    "textoLargo": true,
    "maxCaracteres": 500,
    "condicion": null,
    "opcionesSegun": null
  },
  {
    "id": "colaboracion_7",
    "texto": "Los conflictos se manejan con respeto y foco en soluciones.",
    "descripcion": "",
    "tipo": "escala",
    "obligatoria": true,
    "opciones": [],
    "maxOpciones": 0,
    "escala": {
      "min": 0,
      "max": 10,
      "etiquetaMin": "Totalmente en desacuerdo",
      "etiquetaMax": "Totalmente de acuerdo"
    },
    "textoLargo": true,
    "maxCaracteres": 500,
    "condicion": null,
    "opcionesSegun": null
  },
  {
    "id": "nota_anclas",
    "texto": "Para terminar, cinco preguntas generales",
    "descripcion": "Responde de 0 a 10, según lo que describa mejor tu experiencia hoy.",
    "tipo": "nota",
    "obligatoria": false,
    "opciones": [],
    "maxOpciones": 0,
    "escala": {
      "min": 1,
      "max": 5,
      "etiquetaMin": "Totalmente en desacuerdo",
      "etiquetaMax": "Totalmente de acuerdo"
    },
    "textoLargo": true,
    "maxCaracteres": 500,
    "condicion": null,
    "opcionesSegun": null
  },
  {
    "id": "ancla_1",
    "texto": "¿Qué tan probable es que recomiendes Banconal como un buen lugar para trabajar?",
    "descripcion": "",
    "tipo": "escala",
    "obligatoria": true,
    "opciones": [],
    "maxOpciones": 0,
    "escala": {
      "min": 0,
      "max": 10,
      "etiquetaMin": "Nada probable",
      "etiquetaMax": "Muy probable"
    },
    "textoLargo": true,
    "maxCaracteres": 500,
    "condicion": null,
    "opcionesSegun": null
  },
  {
    "id": "ancla_2",
    "texto": "¿Qué tan probable es que sigas trabajando en Banconal dentro de 12 meses?",
    "descripcion": "",
    "tipo": "escala",
    "obligatoria": true,
    "opciones": [],
    "maxOpciones": 0,
    "escala": {
      "min": 0,
      "max": 10,
      "etiquetaMin": "Nada probable",
      "etiquetaMax": "Muy probable"
    },
    "textoLargo": true,
    "maxCaracteres": 500,
    "condicion": null,
    "opcionesSegun": null
  },
  {
    "id": "ancla_3",
    "texto": "¿Qué tan probable es que busques activamente trabajo fuera de Banconal en los próximos 6 meses?",
    "descripcion": "",
    "tipo": "escala",
    "obligatoria": true,
    "opciones": [],
    "maxOpciones": 0,
    "escala": {
      "min": 0,
      "max": 10,
      "etiquetaMin": "Nada probable",
      "etiquetaMax": "Muy probable"
    },
    "textoLargo": true,
    "maxCaracteres": 500,
    "condicion": null,
    "opcionesSegun": null
  },
  {
    "id": "ancla_4",
    "texto": "Me siento comprometido/a a dar un esfuerzo extra para que Banconal tenga éxito.",
    "descripcion": "",
    "tipo": "escala",
    "obligatoria": true,
    "opciones": [],
    "maxOpciones": 0,
    "escala": {
      "min": 0,
      "max": 10,
      "etiquetaMin": "Totalmente en desacuerdo",
      "etiquetaMax": "Totalmente de acuerdo"
    },
    "textoLargo": true,
    "maxCaracteres": 500,
    "condicion": null,
    "opcionesSegun": null
  },
  {
    "id": "ancla_5",
    "texto": "Siento que mi trabajo tiene sentido y aporta valor.",
    "descripcion": "",
    "tipo": "escala",
    "obligatoria": true,
    "opciones": [],
    "maxOpciones": 0,
    "escala": {
      "min": 0,
      "max": 10,
      "etiquetaMin": "Totalmente en desacuerdo",
      "etiquetaMax": "Totalmente de acuerdo"
    },
    "textoLargo": true,
    "maxCaracteres": 500,
    "condicion": null,
    "opcionesSegun": null
  }
]
$json$::jsonb,
       actualizado_en = now()
 where trim(titulo) = 'Encuesta EXCO - 2026';

-- ---------------------------------------------------------------------
-- 3b) Bienvenida: nombre completo del Banco y conteo de afirmaciones.
--     Solo cambia esas dos frases; el resto del texto queda igual.
-- ---------------------------------------------------------------------
update public.encuestas
   set bienvenida = jsonb_set(
         bienvenida, '{texto}',
         to_jsonb(
           replace(
             regexp_replace(bienvenida->>'texto',
                            'Banco Nacional(?! de Panamá)', 'Banco Nacional de Panamá', 'g'),
             'cada una de las 42 afirmaciones',
             'cada una de las 42 afirmaciones y las 5 preguntas generales del final')
         )),
       actualizado_en = now()
 where trim(titulo) = 'Encuesta EXCO - 2026';

-- ---------------------------------------------------------------------
-- 4) Comprobación. "bloques" debe decir 56 (3 descripciones + 6 demográficas
--    + 42 preguntas + 5 anclas) y "de_escala" 47. La portada mostrará
--    "53 preguntas". Si devuelve 0 filas, el título no coincide: mira el
--    resultado del paso 1 y ajusta el texto entre comillas en los pasos 2 y 3.
-- ---------------------------------------------------------------------
select titulo,
       estado,
       bienvenida->>'texto' as bienvenida,
       jsonb_array_length(preguntas) as bloques,
       (select count(*) from jsonb_array_elements(preguntas) p
         where p->>'tipo' = 'escala')                        as de_escala,
       (select count(*) from jsonb_array_elements(preguntas) p
         where p->'opcionesSegun' is not null
           and p->'opcionesSegun' <> 'null'::jsonb)          as con_opciones_condicionadas
  from public.encuestas
 where trim(titulo) = 'Encuesta EXCO - 2026';
