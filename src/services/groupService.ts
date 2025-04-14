import { supabase } from './supabase';
import NotificationService from './NotificationService';
import { getUserInfoById } from './userService';

// Interfaces para grupos y miembros
export interface Group {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  journey_id?: string;
  description?: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: 'admin' | 'member';
  status: 'pending' | 'accepted' | 'rejected';
  joined_at?: string;
}

export interface GroupWithMembers extends Group {
  members: {
    userId: string;
    username: string;
    status: string;
    role: string;
  }[];
}

// Función para crear un nuevo grupo
export const createGroup = async (
  name: string,
  createdBy: string,
  description?: string,
  journeyId?: string
): Promise<Group | null> => {
  try {
    const { data, error } = await supabase
      .from('groups')
      .insert({
        name,
        created_by: createdBy,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        journey_id: journeyId,
        description
      })
      .select('*')
      .single();

    if (error) throw error;

    // Agregar al creador como miembro y administrador automáticamente
    const { error: memberError } = await supabase
      .from('group_members')
      .insert({
        group_id: data.id,
        user_id: createdBy,
        role: 'admin',
        status: 'accepted',
        joined_at: new Date().toISOString()
      });

    if (memberError) {
      console.error('Error al agregar al creador como miembro:', memberError);
      // No lanzamos error para no interrumpir el flujo
    }

    return data;
  } catch (error) {
    console.error('Error al crear grupo:', error);
    return null;
  }
};

// Función para obtener un grupo por su ID
export const getGroupById = async (groupId: string): Promise<GroupWithMembers | null> => {
  try {
    // Obtener información del grupo
    const { data: groupData, error: groupError } = await supabase
      .from('groups')
      .select('*')
      .eq('id', groupId)
      .single();

    if (groupError) throw groupError;

    // Obtener miembros del grupo
    const { data: membersData, error: membersError } = await supabase
      .from('group_members')
      .select('id, user_id, role, status, joined_at')
      .eq('group_id', groupId);

    if (membersError) throw membersError;

    // Obtener información de cada miembro
    const members = await Promise.all(
      membersData.map(async (member) => {
        const userInfo = await getUserInfoById(member.user_id);
        return {
          id: member.id,
          userId: member.user_id,
          username: userInfo?.username || 'Usuario desconocido',
          role: member.role,
          status: member.status,
          joinedAt: member.joined_at
        };
      })
    );

    return {
      ...groupData,
      members
    };
  } catch (error) {
    console.error('Error al obtener grupo:', error);
    return null;
  }
};

// Función para invitar a un usuario a un grupo
export const inviteUserToGroup = async (
  groupId: string,
  userId: string,
  invitedByUserId: string
): Promise<boolean> => {
  try {
    // Verificar si ya existe una invitación pendiente
    const { data: existingInvite, error: checkError } = await supabase
      .from('group_members')
      .select('id, status')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .single();

    if (!checkError && existingInvite) {
      if (existingInvite.status === 'accepted') {
        console.log('El usuario ya es miembro del grupo');
        return true;
      } else if (existingInvite.status === 'pending') {
        console.log('Ya existe una invitación pendiente para este usuario');
        return true;
      }
    }

    // Obtener información del grupo
    const { data: groupData, error: groupError } = await supabase
      .from('groups')
      .select('name')
      .eq('id', groupId)
      .single();

    if (groupError) throw groupError;

    // Obtener información del usuario que invita
    const invitedByUser = await getUserInfoById(invitedByUserId);
    if (!invitedByUser) throw new Error('No se pudo obtener información del usuario que invita');

    // Crear la invitación
    const { error } = await supabase
      .from('group_members')
      .insert({
        group_id: groupId,
        user_id: userId,
        role: 'member',
        status: 'pending'
      });

    if (error) throw error;

    // Enviar notificación al usuario invitado
    const notificationService = NotificationService.getInstance();
    await notificationService.notifyJourneyShared(
      userId,
      groupData.name,
      invitedByUser.username
    );

    return true;
  } catch (error) {
    console.error('Error al invitar usuario al grupo:', error);
    return false;
  }
};

// Función para aceptar una invitación a un grupo
export const acceptGroupInvitation = async (groupMemberId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('group_members')
      .update({
        status: 'accepted',
        joined_at: new Date().toISOString()
      })
      .eq('id', groupMemberId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error al aceptar invitación a grupo:', error);
    return false;
  }
};

// Función para rechazar una invitación a un grupo
export const rejectGroupInvitation = async (groupMemberId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('group_members')
      .update({
        status: 'rejected'
      })
      .eq('id', groupMemberId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error al rechazar invitación a grupo:', error);
    return false;
  }
};

// Función para obtener los grupos de un usuario
export const getUserGroups = async (userId: string): Promise<GroupWithMembers[]> => {
  try {
    // Obtener todos los IDs de grupos donde el usuario es miembro
    const { data: membershipData, error: membershipError } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', userId)
      .eq('status', 'accepted');

    if (membershipError) throw membershipError;

    if (!membershipData || membershipData.length === 0) {
      return [];
    }

    // Extraer los IDs de grupos
    const groupIds = membershipData.map(item => item.group_id);

    // Obtener información de los grupos
    const { data: groupsData, error: groupsError } = await supabase
      .from('groups')
      .select('*')
      .in('id', groupIds);

    if (groupsError) throw groupsError;

    // Para cada grupo, obtener sus miembros
    const groupsWithMembers = await Promise.all(
      groupsData.map(async (group) => {
        const { data: membersData, error: membersError } = await supabase
          .from('group_members')
          .select('user_id, role, status')
          .eq('group_id', group.id)
          .eq('status', 'accepted');

        if (membersError) throw membersError;

        const members = await Promise.all(
          membersData.map(async (member) => {
            const userInfo = await getUserInfoById(member.user_id);
            return {
              userId: member.user_id,
              username: userInfo?.username || 'Usuario desconocido',
              role: member.role,
              status: member.status
            };
          })
        );

        return {
          ...group,
          members
        };
      })
    );

    return groupsWithMembers;
  } catch (error) {
    console.error('Error al obtener grupos del usuario:', error);
    return [];
  }
};

// Función para obtener las invitaciones pendientes de un usuario
export const getPendingGroupInvitations = async (userId: string) => {
  try {
    const { data: invitationsData, error: invitationsError } = await supabase
      .from('group_members')
      .select(`
        id,
        group_id,
        role,
        groups (
          id,
          name,
          created_by,
          description,
          journey_id
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'pending');

    if (invitationsError) throw invitationsError;

    // Para cada invitación, obtener información del creador del grupo
    const invitationsWithCreatorInfo = await Promise.all(
      invitationsData.map(async (invitation) => {
        const creatorInfo = await getUserInfoById(invitation.groups.created_by);
        return {
          id: invitation.id,
          groupId: invitation.group_id,
          groupName: invitation.groups.name,
          createdBy: creatorInfo?.username || 'Usuario desconocido',
          description: invitation.groups.description,
          journeyId: invitation.groups.journey_id,
          role: invitation.role
        };
      })
    );

    return invitationsWithCreatorInfo;
  } catch (error) {
    console.error('Error al obtener invitaciones pendientes:', error);
    return [];
  }
};

// Función para crear un grupo automáticamente al compartir un viaje
export const createJourneyGroup = async (
  journeyId: string,
  ownerId: string,
  friendId: string,
  cityName: string,
  startDate: Date,
  endDate: Date
): Promise<{
  success: boolean;
  groupId?: string;
  invitationId?: string;
}> => {
  try {
    // Obtener información del usuario propietario
    const ownerInfo = await getUserInfoById(ownerId);
    if (!ownerInfo) throw new Error('No se pudo obtener información del propietario');

    // Crear el grupo
    const groupName = `Viaje a ${cityName}`;
    const description = `Viaje a ${cityName} del ${startDate.toLocaleDateString()} al ${endDate.toLocaleDateString()}`;
    
    const group = await createGroup(groupName, ownerId, description, journeyId);
    if (!group) throw new Error('No se pudo crear el grupo');
    
    // Invitar al amigo al grupo
    const inviteSuccess = await inviteUserToGroup(group.id, friendId, ownerId);
    if (!inviteSuccess) throw new Error('No se pudo invitar al amigo al grupo');

    // Obtener el ID de la invitación para poder referenciarla
    const { data: invitationData, error: invitationError } = await supabase
      .from('group_members')
      .select('id')
      .eq('group_id', group.id)
      .eq('user_id', friendId)
      .eq('status', 'pending')
      .single();

    if (invitationError) {
      console.error('Error al obtener ID de invitación:', invitationError);
      return { success: true, groupId: group.id };
    }

    return {
      success: true,
      groupId: group.id,
      invitationId: invitationData.id
    };
  } catch (error) {
    console.error('Error al crear grupo de viaje:', error);
    return { success: false };
  }
};

// Función para renombrar un grupo
export const renameGroup = async (groupId: string, newName: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('groups')
      .update({
        name: newName,
        updated_at: new Date().toISOString()
      })
      .eq('id', groupId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error al renombrar grupo:', error);
    return false;
  }
};

// Función para eliminar un usuario de un grupo
export const removeUserFromGroup = async (groupId: string, userId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', userId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error al eliminar usuario del grupo:', error);
    return false;
  }
};

// Función para hacer administrador a un miembro
export const makeGroupAdmin = async (groupId: string, userId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('group_members')
      .update({
        role: 'admin'
      })
      .eq('group_id', groupId)
      .eq('user_id', userId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error al hacer administrador:', error);
    return false;
  }
}; 