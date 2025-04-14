# Configuración de Notificaciones Push en TravelQuest

Este documento detalla los pasos necesarios para configurar correctamente las notificaciones push en la aplicación TravelQuest.

## Errores comunes

### 1. Must supply exactly one of [experienceId, projectId]

Si encuentras el siguiente error al iniciar la aplicación:

```
Error registrando notificaciones push: [Error: Error encountered while fetching Expo token, expected an OK response, received: 400 (body: "{"errors":[{"code":"VALIDATION_ERROR","type":"USER","message":"Must supply exactly one of [experienceId, projectId].","isTransient":false,"requestId":"..."}]}").]
```

Es porque la aplicación necesita un valor válido para el `projectId` en la configuración EAS (Expo Application Services).

### 2. "projectId": Invalid uuid

Si encuentras este error:

```
Error al registrar para notificaciones push: [Error: Error encountered while fetching Expo token, expected an OK response, received: 400 (body: "{"errors":[{"code":"VALIDATION_ERROR","type":"USER","message":"\"projectId\": Invalid uuid.","isTransient":false,"requestId":"..."}]}").]
```

El projectId configurado en tu app.json no tiene un formato UUID válido o no está registrado correctamente en los servidores de Expo.

### 3. Error con la tabla user_push_tokens

Si recibes este error:

```
Error al guardar token de notificaciones: {"code": "PGRST204", "details": null, "hint": null, "message": "Could not find the 'push_token' column of 'user_push_tokens' in the schema cache"}
```

Significa que la aplicación estaba buscando la columna `push_token` pero tu tabla utiliza el nombre `token`. Este problema se ha solucionado en la última versión del código.

## Estructura actual de la tabla user_push_tokens

La tabla `user_push_tokens` tiene actualmente la siguiente estructura:

```sql
create table public.user_push_tokens (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  token text not null,
  device_id text null,
  platform text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint user_push_tokens_pkey primary key (id),
  constraint user_push_tokens_user_id_token_key unique (user_id, token),
  constraint user_push_tokens_user_id_fkey foreign key (user_id) references auth.users (id)
);

create index if not exists user_push_tokens_user_id_idx on public.user_push_tokens using btree (user_id);
create index if not exists user_push_tokens_token_idx on public.user_push_tokens using btree (token);
```

El código ahora detecta automáticamente esta estructura y utiliza los nombres de columnas correctos.

## Soluciones:

### 1. Obtener un projectId válido

Para obtener un projectId válido, sigue estos pasos:

1. **Crear o verificar tu cuenta en Expo**:
   - Ve a [expo.dev](https://expo.dev) y regístrate o inicia sesión

2. **Iniciar sesión en la línea de comandos**:
   ```bash
   npx expo login
   ```

3. **Crear un nuevo proyecto en EAS**:
   ```bash
   npx eas project:create
   ```
   - Sigue los pasos y proporciona el nombre de tu proyecto (por ejemplo, "travelquest" - usa minúsculas)
   - El comando te devolverá un projectId que necesitarás usar

### 2. Configurar el projectId en app.json

Abre el archivo `app.json` y asegúrate de que:
1. El "slug" esté en minúsculas (por ejemplo: "travelquest")
2. El projectId sea válido y coincida con el que obtuviste de Expo

```json
"expo": {
  "name": "TravelQuest",
  "slug": "travelquest",
  ...
  "extra": {
    "eas": {
      "projectId": "tu-project-id-real-aquí"
    }
  },
  "owner": "tu-nombre-de-usuario-en-expo"
}
```

### 3. Soluciones adaptativas para la estructura de la base de datos

La aplicación ahora incorpora estas mejoras:

1. **Detección automática de columnas**: El código ahora verifica la estructura de la tabla `user_push_tokens` y se adapta a los nombres de columnas existentes (usa `token` o `push_token` según lo que encuentre).

2. **Soporte para campos adicionales**: Si la tabla tiene columnas como `device_id` o `platform`, el código las llenará automáticamente.

3. **Mejor depuración**: Se ha mejorado la información de diagnóstico para facilitar la identificación de problemas.

4. **Manejo robusto de errores**: La aplicación no fallará si hay problemas con la tabla o la estructura.

### 4. Soluciones alternativas para notificaciones

Si después de los pasos anteriores sigues teniendo problemas con el servicio de notificaciones push, hemos implementado una solución alternativa:

1. **Modo clásico**: La aplicación intentará primero usar el método clásico de notificaciones sin especificar un projectId.

2. **Modo desarrollo personalizado**: Si el modo clásico falla, intentará usar un experienceId basado en tu nombre de usuario de Expo.

3. **Modo a prueba de fallos**: En desarrollo, aunque fallen todos los métodos, la aplicación seguirá funcionando (solo sin notificaciones push).

4. **Notificaciones locales**: Incluso si las notificaciones push fallan, las notificaciones locales dentro de la aplicación seguirán funcionando.

### 5. Reiniciar la aplicación

Después de realizar los cambios, reinicia la aplicación completamente:

```bash
npx expo start --clear
```

## Resolución de problemas

- **Verificar formato del UUID**: Un UUID válido debe tener el formato: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` (donde cada x es un carácter hexadecimal 0-9 o a-f).

- **Verificar registros en la tabla**: Puedes verificar si se están guardando los tokens correctamente con esta consulta SQL en Supabase:
  ```sql
  SELECT * FROM public.user_push_tokens ORDER BY updated_at DESC LIMIT 10;
  ```

- **Probar notificaciones locales**: Para verificar si las notificaciones funcionan, puedes probar con notificaciones locales usando:
  ```javascript
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Prueba local',
      body: 'Esta es una notificación de prueba local',
    },
    trigger: null, // mostrar inmediatamente
  });
  ```

- **Problemas de base de datos**: Si continúas teniendo problemas con la base de datos, verifica los permisos en Supabase para asegurarte de que los usuarios autenticados pueden insertar registros en la tabla.

## Más información

Para obtener información detallada sobre las notificaciones push en Expo, consulta:
- [Documentación oficial de Expo Notifications](https://docs.expo.dev/push-notifications/overview/)
- [Servicio de notificaciones push de Expo](https://docs.expo.dev/push-notifications/push-notifications-setup/)

## Envío de notificaciones desde el servidor

Para enviar notificaciones desde el servidor (por ejemplo, desde una función de Supabase), necesitarás usar la API de Expo Push Notifications:

```javascript
await fetch('https://exp.host/--/api/v2/push/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    to: pushToken,
    title: 'Título de la notificación',
    body: 'Contenido de la notificación',
    data: { additionalData: 'cualquier dato extra' },
  }),
});
```

Asegúrate de que el token que usas está activo y corresponde al dispositivo al que quieres enviar la notificación. 

## Nota sobre la adaptación automática de columnas

El código actual de la aplicación está completamente adaptado para trabajar con la estructura de la tabla `user_push_tokens`. Específicamente:

1. Al guardar un token en la tabla, el código detecta automáticamente si debe usar la columna `token` o `push_token` mediante la consulta:
   ```javascript
   const { data: columnsData } = await supabase
     .from('information_schema.columns')
     .select('column_name')
     .eq('table_schema', 'public')
     .eq('table_name', 'user_push_tokens');
   
   const columnNames = columnsData?.map(col => col.column_name.toLowerCase()) || [];
   
   // Determinar qué columna usar
   if (columnNames.includes('push_token')) {
     tokenData.push_token = pushToken;
   } else if (columnNames.includes('token')) {
     tokenData.token = pushToken;
   }
   ```

2. De manera similar, al recuperar un token para enviar notificaciones, el código verifica la estructura de la tabla y utiliza la columna adecuada:
   ```javascript
   let tokenColumnName = 'token'; // por defecto
   if (columnNames.includes('push_token')) {
     tokenColumnName = 'push_token';
   }
   
   const { data: tokenData } = await supabase
     .from('user_push_tokens')
     .select(`user_id,${tokenColumnName}`)
     .eq('user_id', receiverId);
   ```

Esta adaptación automática garantiza que la aplicación funcione correctamente independientemente de si la tabla usa `token` o `push_token` como nombre de columna.

## Solución al error "relation public.information_schema.columns does not exist"

En algunas versiones o configuraciones de Supabase, puede ocurrir el siguiente error al intentar consultar la estructura de la tabla:

```
Error verificando columnas de la tabla: {"code": "42P01", "details": null, "hint": null, "message": "relation \"public.information_schema.columns\" does not exist"}
```

Este error ocurre porque estamos intentando acceder al catálogo del sistema PostgreSQL a través de la API de Supabase, lo cual puede estar restringido en algunas configuraciones.

### Solución implementada

Para resolver este problema, hemos implementado un enfoque más robusto:

1. **Acceso directo primero**: Intentamos obtener el token directamente usando el nombre de columna conocido (`token`), sin verificar la estructura:
   ```javascript
   const { data: tokenDataDirect } = await supabase
     .from('user_push_tokens')
     .select('token')
     .eq('user_id', receiverId)
     .single();
     
   if (tokenDataDirect && tokenDataDirect.token) {
     // Usar el token encontrado directamente
     return await sendActualNotification(tokenDataDirect.token, title, body, data);
   }
   ```

2. **Fallback a columna alternativa**: Si el método anterior falla, intentamos con la otra columna potencial (`push_token`):
   ```javascript
   const { data: pushTokenData } = await supabase
     .from('user_push_tokens')
     .select('push_token')
     .eq('user_id', receiverId)
     .single();
     
   if (pushTokenData && pushTokenData.push_token) {
     return await sendActualNotification(pushTokenData.push_token, title, body, data);
   }
   ```

3. **Método alternativo para guardar tokens**: Si encontramos el error al guardar un token, usamos una estructura predeterminada:
   ```javascript
   if (columnsError) {
     console.log('Intentando usar estructura predeterminada (columna token)...');
     
     const tokenData = {
       user_id: userId,
       token: pushToken,
       updated_at: new Date().toISOString(),
       platform: Platform.OS,
       device_id: `${Platform.OS}_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`
     };
     
     const { error } = await supabase
       .from('user_push_tokens')
       .upsert(tokenData);
       
     // Verificar resultado...
   }
   ```

Este enfoque más robusto garantiza que la funcionalidad de notificaciones siga funcionando incluso cuando no podemos acceder al esquema de información de PostgreSQL.

## Solución al error de clave duplicada

Después de implementar las soluciones anteriores, puedes encontrarte con este error:

```
Error al guardar token de notificaciones (modo alternativo): {"code": "23505", "details": "Key (user_id, token)=(USER-ID, TOKEN) already exists.", "hint": null, "message": "duplicate key value violates unique constraint \"user_push_tokens_user_id_token_key\""}
```

Este error ocurre porque:

1. La tabla `user_push_tokens` tiene una restricción de unicidad para la combinación de `user_id` y `token`
2. Estamos intentando insertar un token que ya existe para ese usuario

### Solución implementada

Este "error" en realidad es una buena señal - significa que el token ya está registrado para ese usuario. Hemos implementado dos soluciones:

1. **Verificación previa**: Antes de intentar insertar, verificamos si el token ya existe:
   ```javascript
   // Comprobar si ya existe el token
   const { data: existingToken } = await supabase
     .from('user_push_tokens')
     .select('id')
     .eq('user_id', userId)
     .eq('token', pushToken)
     .single();
     
   if (existingToken) {
     console.log('El token ya existe para este usuario');
     return true; // Éxito - no necesitamos hacer nada más
   }
   ```

2. **Detección del error específico**: Si ocurre un error de clave duplicada, lo tratamos como un éxito:
   ```javascript
   if (error) {
     // Si el error es por clave duplicada, esto es técnicamente un éxito
     if (error.code === '23505' && error.message.includes('user_push_tokens_user_id_token_key')) {
       console.log('El token ya existe para este usuario (detectado por error de duplicado)');
       return true;
     }
     // Otro tipo de error
     console.error('Error al guardar token:', error);
     return false;
   }
   ```

Con estas mejoras, el sistema de notificaciones:
1. Intenta usar métodos directos primero
2. Si fallan, usa métodos alternativos 
3. Maneja correctamente los "errores" que en realidad son situaciones normales
4. Proporciona información de diagnóstico detallada 