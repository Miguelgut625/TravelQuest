-- Otorgar permisos para que la función acceda a la tabla de usuarios
GRANT SELECT ON auth.users TO postgres;
GRANT SELECT ON auth.users TO anon;
GRANT SELECT ON auth.users TO authenticated;

-- Actualizar la función para usar el esquema auth directamente
CREATE OR REPLACE FUNCTION get_recent_conversations(user_id UUID)
RETURNS TABLE (
  conversation_user_id UUID,
  username TEXT,
  avatar_url TEXT,
  last_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  unread_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH conversation_partners AS (
    -- Obtener todos los usuarios con los que hay conversaciones
    SELECT DISTINCT 
      CASE 
        WHEN sender_id = user_id THEN receiver_id 
        ELSE sender_id 
      END AS partner_id
    FROM messages
    WHERE sender_id = user_id OR receiver_id = user_id
  ),
  last_messages AS (
    -- Obtener el último mensaje de cada conversación
    SELECT DISTINCT ON (partner_id)
      partner_id,
      m.content,
      m.created_at
    FROM conversation_partners cp
    JOIN messages m ON (
      (m.sender_id = user_id AND m.receiver_id = cp.partner_id) OR
      (m.sender_id = cp.partner_id AND m.receiver_id = user_id)
    )
    ORDER BY partner_id, m.created_at DESC
  ),
  unread_counts AS (
    -- Contar mensajes no leídos por conversación
    SELECT 
      sender_id AS partner_id,
      COUNT(*) AS count
    FROM messages
    WHERE 
      receiver_id = user_id AND 
      read = FALSE
    GROUP BY sender_id
  )
  -- Combinar toda la información, especificando claramente el esquema auth
  SELECT 
    cp.partner_id AS conversation_user_id,
    u.raw_user_meta_data->>'username' AS username,
    u.raw_user_meta_data->>'avatar_url' AS avatar_url,
    lm.content AS last_message,
    lm.created_at,
    COALESCE(uc.count, 0) AS unread_count
  FROM conversation_partners cp
  JOIN auth.users u ON u.id = cp.partner_id
  JOIN last_messages lm ON lm.partner_id = cp.partner_id
  LEFT JOIN unread_counts uc ON uc.partner_id = cp.partner_id
  ORDER BY lm.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Actualizar políticas de seguridad para la tabla friends existente
-- Si la tabla friends ya existe, sólo actualizamos las políticas

-- Habilitar RLS en la tabla friends si no está habilitado
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;

-- Los usuarios sólo pueden ver sus propias amistades
DROP POLICY IF EXISTS "Users can view their own friends" ON friends;
CREATE POLICY "Users can view their own friends" ON friends
  FOR SELECT
  USING ("user1Id" = auth.uid());

-- Los usuarios sólo pueden crear amistades donde ellos son el primer usuario
DROP POLICY IF EXISTS "Users can create friendships" ON friends;
CREATE POLICY "Users can create friendships" ON friends
  FOR INSERT
  WITH CHECK ("user1Id" = auth.uid());

-- Tabla de solicitudes de amistad
CREATE TABLE IF NOT EXISTS friend_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT different_users CHECK (sender_id != receiver_id),
  CONSTRAINT unique_request UNIQUE (sender_id, receiver_id)
);

-- Políticas de seguridad para solicitudes de amistad
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;

-- Los usuarios pueden ver solicitudes que han enviado o recibido
CREATE POLICY "Users can view their own requests" ON friend_requests
  FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Los usuarios sólo pueden crear solicitudes donde ellos son el remitente
CREATE POLICY "Users can create friend requests" ON friend_requests
  FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Los usuarios sólo pueden actualizar solicitudes que han recibido
CREATE POLICY "Users can update received requests" ON friend_requests
  FOR UPDATE
  USING (auth.uid() = receiver_id);

-- Los usuarios pueden eliminar solicitudes que han enviado
CREATE POLICY "Users can delete sent requests" ON friend_requests
  FOR DELETE
  USING (auth.uid() = sender_id); 