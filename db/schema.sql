-- Esquema completo de la app de multas por ejercicio semanal.
-- Ejecutalo una sola vez en el SQL Editor de Supabase.

create schema if not exists multas;

create table if not exists multas.personas (
  id           bigint generated always as identity primary key,
  nombre       text not null unique,
  alias        text[] not null default '{}',
  meta_default smallint check (meta_default between 1 and 7),
  es_receptor  boolean not null default false,
  activo       boolean not null default true,
  creado_en    timestamptz not null default now()
);

create table if not exists multas.semanas (
  id               bigint generated always as identity primary key,
  numero           integer not null,
  fecha_cierre     date not null,
  texto_original   text not null,
  procesada_por    text not null,
  estado           text not null default 'procesada' check (estado in ('procesada','anulada')),
  anulada_por      text,
  anulada_en       timestamptz,
  motivo_anulacion text,
  creado_en        timestamptz not null default now()
);

-- IDEMPOTENCIA + CONCURRENCIA: solo puede existir una semana viva por numero.
-- Dos mensajes simultaneos no pueden crear la misma semana dos veces.
create unique index if not exists semanas_numero_viva
  on multas.semanas (numero) where estado = 'procesada';

create table if not exists multas.multas (
  id             bigint generated always as identity primary key,
  semana_id      bigint not null references multas.semanas(id) on delete cascade,
  persona_id     bigint not null references multas.personas(id),
  dias_cumplidos smallint not null,
  meta           smallint not null,
  monto          integer not null default 0,
  estado         text not null default 'cobrada' check (estado in ('cobrada','exenta','anulada')),
  emoji          text,
  motivo         text,
  creado_en      timestamptz not null default now()
);
create unique index if not exists multas_semana_persona on multas.multas (semana_id, persona_id);
create index if not exists multas_persona_idx on multas.multas (persona_id);

create table if not exists multas.abonos (
  id             bigint generated always as identity primary key,
  persona_id     bigint not null references multas.personas(id),
  monto          integer not null check (monto <> 0),
  fecha          date not null default (now() at time zone 'America/Bogota')::date,
  nota           text,
  tipo           text not null default 'abono' check (tipo in ('abono','saldo_inicial')),
  registrado_por text not null,
  estado         text not null default 'activo' check (estado in ('activo','anulado')),
  creado_en      timestamptz not null default now()
);
create index if not exists abonos_persona_idx on multas.abonos (persona_id);
create unique index if not exists abonos_saldo_inicial_unico
  on multas.abonos (persona_id) where tipo = 'saldo_inicial' and estado = 'activo';

create table if not exists multas.bitacora (
  id        bigint generated always as identity primary key,
  accion    text not null,
  autor     text not null,
  detalle   jsonb not null default '{}'::jsonb,
  creado_en timestamptz not null default now()
);
create index if not exists bitacora_creado_idx on multas.bitacora (creado_en desc);

create table if not exists multas.telegram_updates (
  update_id bigint primary key,
  visto_en  timestamptz not null default now()
);

create table if not exists multas.pendientes_mapeo (
  id            bigint generated always as identity primary key,
  nombre        text not null,
  semana_numero integer,
  resuelto      boolean not null default false,
  creado_en     timestamptz not null default now()
);

-- Saldo SIEMPRE calculado desde los movimientos, nunca almacenado.
drop view if exists multas.saldos;
create view multas.saldos as
select p.id, p.nombre, p.activo, p.es_receptor,
       coalesce(si.inicial, 0)     as saldo_inicial,
       coalesce(m.total_multas, 0) as total_multas,
       coalesce(a.total_abonos, 0) as total_abonos,
       coalesce(si.inicial, 0) + coalesce(m.total_multas, 0) - coalesce(a.total_abonos, 0) as saldo
from multas.personas p
left join (select persona_id, sum(monto)::int as total_multas
           from multas.multas where estado = 'cobrada' group by persona_id) m on m.persona_id = p.id
left join (select persona_id, sum(monto)::int as total_abonos
           from multas.abonos where estado = 'activo' and tipo = 'abono' group by persona_id) a on a.persona_id = p.id
left join (select persona_id, sum(monto)::int as inicial
           from multas.abonos where estado = 'activo' and tipo = 'saldo_inicial' group by persona_id) si on si.persona_id = p.id;
