# Sistema de Logros en TravelQuest

Este documento explica cómo funcionan los logros (badges) en la aplicación TravelQuest y cómo configurar nuevos logros.

## Tabla de Logros (badges)

La tabla `badges` en la base de datos tiene la siguiente estructura:

```sql
create table public.badges (
  id uuid not null default gen_random_uuid (),
  created_at timestamp with time zone not null default now(),
  name text not null,
  description text not null,
  icon text not null,
  category text not null,
  threshold bigint not null,
  constraint badges_pkey primary key (id),
  constraint badges_category_check check (
    (
      category = any (
        array[
          'missions'::text,
          'cities'::text,
          'level'::text,
          'social'::text,
          'special'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;
```

## Categorías de Logros

La aplicación admite 5 categorías de logros:

1. **missions**: Logros por completar misiones (ej. completar 5, 25, 50 misiones)
2. **cities**: Logros por visitar ciudades (ej. visitar 3, 10, 25 ciudades)
3. **level**: Logros por alcanzar ciertos niveles (ej. nivel 5, 10, 25)
4. **social**: Logros por conexiones sociales (ej. tener 5, 20, 50 amigos)
5. **special**: Logros especiales por acciones específicas

## Cómo Funcionan los Logros

Cada logro tiene un valor de `threshold` (umbral) que determina cuándo se otorga al usuario:

- Para logros de **missions**: El umbral es el número de misiones completadas
- Para logros de **cities**: El umbral es el número de ciudades visitadas
- Para logros de **level**: El umbral es el nivel que el usuario debe alcanzar
- Para logros de **social**: El umbral es el número de amigos que debe tener
- Para logros de **special**: El umbral varía según el logro específico

## Verificación de Logros

Los logros se verifican en diferentes momentos:

1. Cuando un usuario completa una misión
2. Cuando un usuario visita una nueva ciudad
3. Cuando un usuario sube de nivel
4. Cuando se ejecuta el script programado de verificación de logros

### Funciones Principales

La verificación de logros se realiza mediante las siguientes funciones en `badgeService.ts`:

- `checkMissionBadges(userId)`: Verifica logros por misiones completadas
- `checkLevelBadges(userId)`: Verifica logros por nivel alcanzado
- `checkCityBadges(userId)`: Verifica logros por ciudades visitadas
- `awardSpecificBadges(userId, eventType)`: Otorga logros específicos por eventos especiales
- `checkNewCityBadgeAndAwardPoints(userId)`: Verifica el logro de ciudad nueva y otorga puntos extra

## Logros Especiales Configurados

### Logro por Descubrir Nueva Ciudad
- **ID**: 49a07ba9-f0c6-40f1-ab8e-f4f7d56c3f2e
- **Descripción**: Se otorga cuando un usuario visita una ciudad que no estaba en la base de datos
- **Comportamiento especial**: Si el usuario ya tiene este logro, recibe 500 puntos extra y una notificación

### Logro Primera Misión
- **ID**: dc8272f5-d661-402f-a9a3-46bf86289bd3
- **Descripción**: Se otorga cuando un usuario completa su primera misión

## Cómo Agregar Nuevos Logros

### 1. Insertar en la Base de Datos

Utiliza el script `scripts/insert_badges.sql` para insertar nuevos logros en la base de datos.

```sql
INSERT INTO public.badges (name, description, icon, category, threshold)
VALUES ('Nombre del Logro', 'Descripción del logro', 'URL_del_icono', 'categoría', umbral);
```

### 2. Para Logros Especiales

Si deseas crear un logro especial que se otorgue por un evento específico:

1. Inserta el logro en la base de datos como se muestra arriba
2. Añade el ID del logro al mapa `specificBadgesMap` en `badgeService.ts`:

```typescript
const specificBadgesMap: Record<string, string[]> = {
  'nombreDelEvento': [
    'ID-del-nuevo-logro-especial',
  ],
  // ... otros eventos existentes
};
```

3. Llama a la función `awardSpecificBadges(userId, 'nombreDelEvento')` cuando ocurra el evento correspondiente

## Notificaciones de Logros

Cuando un usuario recibe un nuevo logro, se le envía una notificación a través del sistema de notificaciones de la aplicación.

## Script de Verificación Programada

El script `scripts/check_badges.js` puede configurarse para ejecutarse periódicamente (por ejemplo, mediante cron jobs) para verificar logros de todos los usuarios. Esto es útil para otorgar logros que puedan haberse perdido durante el uso normal de la aplicación. 