-- Personas del grupo "Ejercicio o Money".
-- El nombre visible es el apodo que se usa en el mensaje de WhatsApp.
-- Los alias incluyen el nombre real de Splitwise para que el parser reconozca ambas formas.
insert into multas.personas (nombre, alias, es_receptor, activo) values
  ('Naranjo',     array['naranjo','juan diego naranjo','juan diego'],          false, true),
  ('Hoyos',       array['hoyos','juan jose hoyos','juan j'],                   false, true),
  ('Betán',       array['betan','betán'],                                      false, true),
  ('Yummy',       array['yummy','juan jose calderon','calderon'],              false, true),
  ('Juanbol',     array['juanbol','juan bol','juan david bolanos','bolanos'],  false, true),
  ('Juan Marcos', array['juan marcos','juanmarcos','marcos'],                  false, true),
  ('Lucho',       array['lucho','felipe sanchez','felipe'],                    false, true),
  ('Will',        array['will','wiljo','wiljo ibarra','ibarra'],               false, true),
  ('Jorge',       array['jorge','jorge jimenez garcia','jimenez'],             false, true),
  ('Placeholder', array['placeholder','bote'],                                 true,  true)
on conflict (nombre) do nothing;
