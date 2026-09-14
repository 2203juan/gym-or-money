-- Saldos iniciales migrados de Splitwise (corte del 14/09/2026).
-- Positivo = debe. Negativo = tiene saldo a favor.
-- La suma neta es 1.434.620, exactamente lo que "Placeholder recupera" en Splitwise.
with datos(nombre, monto) as (values
  ('Hoyos',        249320),
  ('Betán',        367750),
  ('Jorge',        230000),
  ('Juan Marcos',  227480),
  ('Will',         143620),
  ('Juanbol',      105000),
  ('Naranjo',       81000),
  ('Yummy',         77000),
  ('Lucho',        -46550)
)
insert into multas.abonos (persona_id, monto, fecha, nota, tipo, registrado_por)
select p.id, d.monto, (now() at time zone 'America/Bogota')::date,
       'Saldo inicial migrado de Splitwise', 'saldo_inicial', 'Juan'
from datos d join multas.personas p on p.nombre = d.nombre
on conflict do nothing;

insert into multas.bitacora (accion, autor, detalle)
values ('saldo_inicial_migrado', 'Juan',
        '{"origen":"Splitwise","personas":9,"total":1434620}'::jsonb);
