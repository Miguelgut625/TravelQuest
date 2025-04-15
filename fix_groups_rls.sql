-- Script para corregir recursión infinita en las políticas RLS
-- Primero deshabilitar RLS temporalmente para garantizar que podemos hacer cambios
ALTER TABLE groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE group_members DISABLE ROW LEVEL SECURITY;

-- Eliminar todas las políticas existentes
DROP POLICY IF EXISTS "Grupos visibles para miembros" ON groups;
DROP POLICY IF EXISTS "Solo administradores pueden actualizar grupos" ON groups;
DROP POLICY IF EXISTS "Ver miembros y sus propias invitaciones" ON group_members;
DROP POLICY IF EXISTS "Creadores pueden añadir miembros" ON group_members;
DROP POLICY IF EXISTS "Actualizar estado de membresía" ON group_members;
DROP POLICY IF EXISTS "Eliminar miembros del grupo" ON group_members;
DROP POLICY IF EXISTS "Ver miembros del grupo" ON group_members;
DROP POLICY IF EXISTS "Gestionar miembros del grupo" ON group_members;
DROP POLICY IF EXISTS "Gestionar propias invitaciones" ON group_members;
DROP POLICY IF EXISTS "Eliminar miembros" ON group_members;
DROP POLICY IF EXISTS "Cualquiera puede crear grupos" ON groups;
DROP POLICY IF EXISTS "Ver grupos propios" ON groups;
DROP POLICY IF EXISTS "Ver grupos donde soy miembro" ON groups;
DROP POLICY IF EXISTS "Actualizar grupos propios" ON groups;
DROP POLICY IF EXISTS "Eliminar grupos propios" ON groups;
DROP POLICY IF EXISTS "Miembros del grupo pueden ver mensajes" ON group_messages;
DROP POLICY IF EXISTS "Usuarios pueden enviar mensajes a grupos donde son miembros" ON group_messages;

-- *** SECCIÓN DE CORRECCIÓN DE COLUMNAS ***
-- Asegurarse de que journeys_shared use group_id en lugar de groupId
DO $$
BEGIN
    -- Verificar si existe la columna groupId pero no group_id
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'journeys_shared' 
        AND column_name = 'groupid'
    ) AND NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'journeys_shared' 
        AND column_name = 'group_id'
    ) THEN
        -- Renombrar la columna a group_id
        ALTER TABLE journeys_shared RENAME COLUMN groupid TO group_id;
        RAISE NOTICE 'Columna groupid renombrada a group_id en journeys_shared';
    ELSIF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'journeys_shared' 
        AND column_name = 'groupid'
    ) AND EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'journeys_shared' 
        AND column_name = 'group_id'
    ) THEN
        -- Caso en que existen ambas columnas, migrar datos y eliminar la antigua
        UPDATE journeys_shared 
        SET group_id = groupid 
        WHERE group_id IS NULL AND groupid IS NOT NULL;
        
        ALTER TABLE journeys_shared DROP COLUMN groupid;
        RAISE NOTICE 'Datos migrados de groupid a group_id y columna groupid eliminada';
    END IF;
END $$;

-- Crear índices para mejorar el rendimiento de las consultas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_indexes 
        WHERE tablename = 'group_members' 
        AND indexname = 'idx_group_members_user_id_status'
    ) THEN
        CREATE INDEX idx_group_members_user_id_status ON group_members(user_id, status);
        RAISE NOTICE 'Índice idx_group_members_user_id_status creado';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_indexes 
        WHERE tablename = 'groups' 
        AND indexname = 'idx_groups_created_by'
    ) THEN
        CREATE INDEX idx_groups_created_by ON groups(created_by);
        RAISE NOTICE 'Índice idx_groups_created_by creado';
    END IF;
END $$;

-- VOLVER A HABILITAR RLS
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

-- Ahora recrear las políticas simplificadas sin referencias circulares

-- 1. POLÍTICAS PARA LA TABLA GROUPS
-- Política para permitir a cualquiera crear grupos
CREATE POLICY groups_insert ON groups
  FOR INSERT
  WITH CHECK (true);

-- Política para ver grupos que uno ha creado
CREATE POLICY groups_select_own ON groups
  FOR SELECT
  USING (auth.uid() = created_by);

-- Política directa para actualizar grupos propios
CREATE POLICY groups_update_own ON groups
  FOR UPDATE
  USING (auth.uid() = created_by);

-- Política directa para eliminar grupos propios
CREATE POLICY groups_delete_own ON groups
  FOR DELETE
  USING (auth.uid() = created_by);

-- 2. POLÍTICAS PARA LA TABLA GROUP_MEMBERS
-- Política para que cada usuario vea sus propias membresías
CREATE POLICY members_select_own ON group_members
  FOR SELECT
  USING (auth.uid() = user_id);

-- Política para que los creadores de grupos vean todos los miembros
CREATE POLICY members_select_as_creator ON group_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM groups 
      WHERE id = group_id AND created_by = auth.uid()
    )
  );

-- Política para que los creadores de grupos añadan miembros
CREATE POLICY members_insert_as_creator ON group_members
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM groups 
      WHERE id = group_id AND created_by = auth.uid()
    )
  );

-- Política para que los usuarios gestionen sus invitaciones
CREATE POLICY members_update_own ON group_members
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Política para que los creadores de grupos gestionen invitaciones
CREATE POLICY members_update_as_creator ON group_members
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM groups 
      WHERE id = group_id AND created_by = auth.uid()
    )
  );

-- Política para que los creadores eliminen miembros
CREATE POLICY members_delete_as_creator ON group_members
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM groups 
      WHERE id = group_id AND created_by = auth.uid()
    )
  );

-- 3. POLÍTICAS PARA VER GRUPOS DONDE SOY MIEMBRO (VERSIÓN SIMPLIFICADA)
-- Esta política se agrega después de todas las demás para evitar recursión
-- Política simplificada que usa una subconsulta directa sin recursión
CREATE POLICY groups_select_as_member ON groups
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_id = id 
      AND user_id = auth.uid() 
      AND status = 'accepted'
    )
  );

-- 4. POLÍTICAS PARA MENSAJES DE GRUPO
-- Política para ver mensajes de grupos propios
CREATE POLICY messages_select_own_groups ON group_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM groups
      WHERE id = group_id AND created_by = auth.uid()
    )
  );

-- Política para ver mensajes como miembro
CREATE POLICY messages_select_as_member ON group_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_id = group_messages.group_id
      AND user_id = auth.uid()
      AND status = 'accepted'
    )
  );

-- Política para enviar mensajes
CREATE POLICY messages_insert ON group_messages
  FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND (
      EXISTS (
        SELECT 1 FROM group_members
        WHERE group_id = group_messages.group_id
        AND user_id = auth.uid()
        AND status = 'accepted'
      ) OR
      EXISTS (
        SELECT 1 FROM groups
        WHERE id = group_messages.group_id
        AND created_by = auth.uid()
      )
    )
  ); 