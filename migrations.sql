-- Tabla para grupos
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  journey_id UUID REFERENCES journeys (id) ON DELETE SET NULL,
  description TEXT,
  CONSTRAINT groups_created_by_fkey FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE CASCADE
);

-- Tabla para miembros de grupos
CREATE TABLE IF NOT EXISTS group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'member')),
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')),
  joined_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT group_members_group_id_user_id_key UNIQUE (group_id, user_id)
);

-- Modificar tabla de journeys_shared para añadir campos de estado y relación con grupos
ALTER TABLE IF EXISTS journeys_shared 
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups (id) ON DELETE SET NULL;

-- Crear índices para optimizar búsquedas
CREATE INDEX IF NOT EXISTS idx_groups_created_by ON groups (created_by);
CREATE INDEX IF NOT EXISTS idx_groups_journey_id ON groups (journey_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members (group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members (user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_status ON group_members (status);
CREATE INDEX IF NOT EXISTS idx_journeys_shared_status ON journeys_shared (status);
CREATE INDEX IF NOT EXISTS idx_journeys_shared_group_id ON journeys_shared (group_id);

-- Añadir política RLS para que solo los miembros del grupo puedan ver el grupo
CREATE POLICY "Grupos visibles para miembros" ON groups
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM group_members 
      WHERE group_id = id AND status = 'accepted'
    ) OR auth.uid() = created_by
  );

-- Política para que solo administradores puedan actualizar el grupo
CREATE POLICY "Solo administradores pueden actualizar grupos" ON groups
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT user_id FROM group_members 
      WHERE group_id = id AND role = 'admin' AND status = 'accepted'
    ) OR auth.uid() = created_by
  );

-- Políticas para group_members
DROP POLICY IF EXISTS "Miembros visibles para miembros del grupo" ON group_members;
DROP POLICY IF EXISTS "Ver invitaciones propias" ON group_members;
DROP POLICY IF EXISTS "Administradores pueden gestionar miembros" ON group_members;
DROP POLICY IF EXISTS "Usuario puede gestionar sus invitaciones" ON group_members;

-- Política para SELECT: simplificada para evitar recursión
CREATE POLICY "Ver miembros y sus propias invitaciones" ON group_members
  FOR SELECT
  USING (
    auth.uid() = user_id OR 
    auth.uid() IN (SELECT created_by FROM groups WHERE id = group_id)
  );

-- Política para INSERT: permitir al creador del grupo añadir miembros
CREATE POLICY "Creadores pueden añadir miembros" ON group_members
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (SELECT created_by FROM groups WHERE id = group_id)
  );

-- Política para UPDATE: permitir gestionar estado y rol
CREATE POLICY "Actualizar estado de membresía" ON group_members
  FOR UPDATE
  USING (
    auth.uid() = user_id OR 
    auth.uid() IN (SELECT created_by FROM groups WHERE id = group_id)
  );

-- Política para DELETE: sólo creadores pueden eliminar miembros
CREATE POLICY "Eliminar miembros del grupo" ON group_members
  FOR DELETE
  USING (
    auth.uid() IN (SELECT created_by FROM groups WHERE id = group_id)
  );

-- Habilitar RLS en las tablas
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

-- Tabla para mensajes de grupo
CREATE TABLE IF NOT EXISTS group_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES groups (id) ON DELETE CASCADE,
  text TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read BOOLEAN DEFAULT FALSE,
  sender_username VARCHAR(255),
  CONSTRAINT group_messages_text_or_image CHECK (text IS NOT NULL OR image_url IS NOT NULL)
);

-- Índices para mensajes de grupo
CREATE INDEX IF NOT EXISTS idx_group_messages_group_id ON group_messages (group_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_sender_id ON group_messages (sender_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_created_at ON group_messages (created_at);

-- Políticas RLS para mensajes de grupo
CREATE POLICY "Miembros del grupo pueden ver mensajes" ON group_messages
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM group_members 
      WHERE group_id = group_messages.group_id AND status = 'accepted'
    ) OR auth.uid() IN (
      SELECT created_by FROM groups WHERE id = group_messages.group_id
    )
  );

CREATE POLICY "Usuarios pueden enviar mensajes a grupos donde son miembros" ON group_messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND (
      auth.uid() IN (
        SELECT user_id FROM group_members 
        WHERE group_id = group_messages.group_id AND status = 'accepted'
      ) OR auth.uid() IN (
        SELECT created_by FROM groups WHERE id = group_messages.group_id
      )
    )
  );

-- Habilitar RLS en la tabla de mensajes de grupo
ALTER TABLE group_messages ENABLE ROW LEVEL SECURITY; 