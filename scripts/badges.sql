-- Script para insertar logros en la tabla badges
-- Ejecutar este script en la base de datos donde se encuentra la tabla badges

-- Logros de misiones completadas
INSERT INTO public.badges (name, description, icon, category, threshold)
VALUES 
('Explorador Novato', 'Has completado 5 misiones. ¡Apenas estás empezando tu aventura!', 'https://example.com/icons/novice_explorer.png', 'missions', 5),
('Aventurero', 'Has completado 25 misiones. Tu espíritu aventurero se está fortaleciendo.', 'https://example.com/icons/adventurer.png', 'missions', 25),
('Explorador Experimentado', 'Has completado 50 misiones. Estás ganando reconocimiento por tus aventuras.', 'https://example.com/icons/experienced_explorer.png', 'missions', 50),
('Maestro Explorador', 'Has completado 100 misiones. Eres un verdadero experto en exploración.', 'https://example.com/icons/master_explorer.png', 'missions', 100),
('Leyenda Viajera', 'Has completado 250 misiones. Tu nombre es conocido entre los viajeros de todo el mundo.', 'https://example.com/icons/traveler_legend.png', 'missions', 250);

-- Logros de ciudades visitadas
INSERT INTO public.badges (name, description, icon, category, threshold)
VALUES 
('Viajero Local', 'Has visitado 3 ciudades. Estás comenzando a explorar el mundo.', 'https://example.com/icons/local_traveler.png', 'cities', 3),
('Trotamundos', 'Has visitado 10 ciudades. Tu pasaporte comienza a llenarse.', 'https://example.com/icons/globetrotter.png', 'cities', 10),
('Ciudadano del Mundo', 'Has visitado 25 ciudades. El mundo es tu hogar.', 'https://example.com/icons/world_citizen.png', 'cities', 25),
('Explorador Urbano', 'Has visitado 50 ciudades. Conoces los secretos de las metrópolis.', 'https://example.com/icons/urban_explorer.png', 'cities', 50),
('Conquistador de Ciudades', 'Has visitado 100 ciudades. Pocas personas conocen tantos rincones del mundo.', 'https://example.com/icons/city_conqueror.png', 'cities', 100);

-- Logros de nivel alcanzado
INSERT INTO public.badges (name, description, icon, category, threshold)
VALUES 
('Principiante', 'Has alcanzado el nivel 5. Tu viaje apenas comienza.', 'https://example.com/icons/beginner.png', 'level', 5),
('Viajero Intermedio', 'Has alcanzado el nivel 10. Estás adquiriendo experiencia.', 'https://example.com/icons/intermediate.png', 'level', 10),
('Viajero Avanzado', 'Has alcanzado el nivel 25. Tu experiencia es notable.', 'https://example.com/icons/advanced.png', 'level', 25),
('Viajero Experto', 'Has alcanzado el nivel 50. Eres un experto en tus viajes.', 'https://example.com/icons/expert.png', 'level', 50),
('Viajero Legendario', 'Has alcanzado el nivel 100. Tu saga de viajes es legendaria.', 'https://example.com/icons/legendary.png', 'level', 100);

-- Logros sociales
INSERT INTO public.badges (name, description, icon, category, threshold)
VALUES 
('Sociable', 'Has conectado con 5 amigos. Estás construyendo tu red de viajeros.', 'https://example.com/icons/sociable.png', 'social', 5),
('Popular', 'Has conectado con 20 amigos. Tu comunidad de viaje está creciendo.', 'https://example.com/icons/popular.png', 'social', 20),
('Influyente', 'Has conectado con 50 amigos. Tu influencia en la comunidad viajera es notable.', 'https://example.com/icons/influential.png', 'social', 50),
('Celebridad Viajera', 'Has conectado con 100 amigos. Eres una celebridad entre los viajeros.', 'https://example.com/icons/celebrity.png', 'social', 100),
('Líder de Comunidad', 'Has conectado con 200 amigos. Lideras una comunidad vibrante de viajeros.', 'https://example.com/icons/community_leader.png', 'social', 200);

-- Logros especiales
INSERT INTO public.badges (name, description, icon, category, threshold)
VALUES 
('Descubridor', 'Has encontrado una ciudad que no estaba en nuestra base de datos. ¡Gracias por contribuir!', 'https://example.com/icons/discoverer.png', 'special', 1),
('Fotógrafo Viajero', 'Has subido 50 fotos a tu diario de viaje. Tus memorias perdurarán.', 'https://example.com/icons/photographer.png', 'special', 50),
('Maratonista de Viajes', 'Has completado 10 misiones en un solo día. ¡Qué energía!', 'https://example.com/icons/marathon.png', 'special', 10),
('Explorador Nocturno', 'Has completado 20 misiones durante la noche. Las estrellas son tus guías.', 'https://example.com/icons/night_explorer.png', 'special', 20),
('Viajero Todo Terreno', 'Has completado misiones en 5 tipos diferentes de lugares. Montaña, playa, ciudad, bosque, desierto.', 'https://example.com/icons/all_terrain.png', 'special', 5);

-- Actualizar el UUID del logro de descubridor para que sea exactamente 49a07ba9-f0c6-40f1-ab8e-f4f7d56c3f2e
UPDATE public.badges 
SET id = '49a07ba9-f0c6-40f1-ab8e-f4f7d56c3f2e'
WHERE name = 'Descubridor' AND category = 'special';

-- Crear el logro específico para completar la primera misión con el ID requerido
INSERT INTO public.badges (id, name, description, icon, category, threshold)
VALUES 
('dc8272f5-d661-402f-a9a3-46bf86289bd3', 'Primera Aventura', 'Has completado tu primera misión. ¡El inicio de una gran aventura!', 'https://example.com/icons/first_adventure.png', 'missions', 1);

-- Crear el logro de descubridor de nuevas ciudades con el ID específico requerido
INSERT INTO public.badges (id, name, description, icon, category, threshold)
VALUES 
('e733a802-553b-4a69-ae09-9b772dd7f8f1', 'Explorador de Nuevas Ciudades', 'Has encontrado una ciudad que no estaba en nuestra base de datos. ¡Gracias por contribuir!', 'https://example.com/icons/city_explorer.png', 'special', 1)
ON CONFLICT (id) 
DO UPDATE SET 
  name = 'Explorador de Nuevas Ciudades',
  description = 'Has encontrado una ciudad que no estaba en nuestra base de datos. ¡Gracias por contribuir!',
  icon = 'https://example.com/icons/city_explorer.png',
  category = 'special',
  threshold = 1;

-- Puedes ejecutar el siguiente comando para asignar manualmente el logro a un usuario específico (reemplaza 'ID_DE_TU_USUARIO')
-- INSERT INTO public.user_badges (userId, badgeId, unlocked_at)
-- VALUES ('ID_DE_TU_USUARIO', 'e733a802-553b-4a69-ae09-9b772dd7f8f1', now()); 