import { supabase } from './supabase';
import { uploadImageToCloudinary } from './cloudinaryService';
import { sendPushNotification } from './NotificationService';
import { getUserInfoById } from './userService';

export interface Message {
  id: string;
  sender_id: string;
  receiver_id?: string | null;
  group_id?: string | null;
  content?: string;
  text?: string;
  image_url?: string | null;
  created_at: string;
  read: boolean;
  sender_username?: string;
}

// Función para enviar un mensaje de texto
export const sendMessage = async (receiverId: string, text: string, imageUrl?: string | null): Promise<Message | null> => {
  try {
    // Si se proporciona una imagen, usar esa URL como contenido
    const content = imageUrl || text;
    
    // Obtener ID del usuario autenticado
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('No hay sesión de usuario');
    }
    
    const senderId = session.user.id;
    
    console.log(`Enviando mensaje: De ${senderId} a ${receiverId} - Contenido: ${content.substring(0, 20)}...`);

    const { data, error } = await supabase
      .from('messages')
      .insert({
        sender_id: senderId,
        receiver_id: receiverId,
        content,
        created_at: new Date().toISOString(),
        read: false
      })
      .select()
      .single();

    if (error) {
      console.error('Error enviando mensaje:', error);
      throw error;
    }

    console.log('Mensaje enviado con éxito:', data);

    // Obtener información del remitente para la notificación
    try {
      const { data: senderData, error: userError } = await supabase
        .from('users')
        .select('username')
        .eq('id', senderId)
        .single();

      if (!userError && senderData) {
        // Enviar notificación push al destinatario
        sendNewMessageNotification(
          receiverId, 
          senderData.username || 'Usuario', 
          imageUrl ? '📷 Te ha enviado una imagen' : text,
          senderId
        ).catch(notifError => {
          console.error('Error enviando notificación push:', notifError);
        });
      }
    } catch (userError) {
      console.error('Error obteniendo datos del remitente:', userError);
    }

    // Transformar el mensaje para que sea compatible con la interfaz
    const isImageContent = 
      content.startsWith('http') && 
      (content.includes('.jpg') || 
       content.includes('.jpeg') || 
       content.includes('.png') || 
       content.includes('.gif') || 
       content.includes('cloudinary'));
       
    const transformedMessage = {
      ...data,
      text: isImageContent ? '' : content, // Si es una imagen, no mostrar texto
      image_url: isImageContent ? content : imageUrl
    };

    return transformedMessage;
  } catch (error) {
    console.error('Error inesperado enviando mensaje:', error);
    throw error;
  }
};

// Función para enviar un mensaje con imagen
export const sendImageMessage = async (senderId: string, receiverId: string, imageUri: string): Promise<Message | null> => {
  try {
    console.log(`Enviando mensaje con imagen: De ${senderId} a ${receiverId}`);

    // Subir la imagen a Cloudinary
    const chatImageId = `chat_${senderId}_${receiverId}_${Date.now()}`;
    const imageUrl = await uploadImageToCloudinary(imageUri, chatImageId);

    if (!imageUrl) {
      throw new Error('No se pudo subir la imagen');
    }

    console.log('Imagen subida a Cloudinary:', imageUrl);

    // Crear el mensaje usando la URL de la imagen directamente como el contenido
    const { data, error } = await supabase
      .from('messages')
      .insert({
        sender_id: senderId,
        receiver_id: receiverId,
        content: imageUrl,  // Usar la URL directamente como contenido
        created_at: new Date().toISOString(),
        read: false
      })
      .select()
      .single();

    if (error) {
      console.error('Error enviando mensaje con imagen:', error);
      throw error;
    }

    // Obtener información del remitente para la notificación
    try {
      const { data: senderData, error: userError } = await supabase
        .from('users')
        .select('username')
        .eq('id', senderId)
        .single();

      if (!userError && senderData) {
        // Enviar notificación push al destinatario
        sendNewMessageNotification(
          receiverId,
          senderData.username || 'Usuario',
          '📷 Te ha enviado una imagen',
          senderId
        ).catch(notifError => {
          console.error('Error enviando notificación push:', notifError);
        });
      }
    } catch (userError) {
      console.error('Error obteniendo datos del remitente:', userError);
    }

    console.log('Mensaje con imagen enviado con éxito:', data);
    
    // Transformar el mensaje para que sea compatible con la interfaz
    const transformedMessage = {
      ...data,
      text: '',
      image_url: imageUrl
    };
    
    return transformedMessage;
  } catch (error) {
    console.error('Error inesperado enviando mensaje con imagen:', error);
    throw error;
  }
};

// Función para obtener los mensajes entre dos usuarios
export const getConversation = async (userId1: string, userId2: string): Promise<Message[]> => {
  try {
    console.log(`Obteniendo conversación entre ${userId1} y ${userId2}`);

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${userId1},receiver_id.eq.${userId2}),and(sender_id.eq.${userId2},receiver_id.eq.${userId1})`)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error obteniendo conversación:', error);
      throw error;
    }

    console.log(`Conversación entre ${userId1} y ${userId2} cargada: ${data?.length || 0} mensajes`);

    if (data && data.length > 0) {
      console.log('Último mensaje:', data[data.length - 1]);
      
      // Transformar los mensajes para que sean compatibles con la interfaz Message
      const transformedMessages = data.map(msg => {
        const isImageContent = 
          msg.content && 
          msg.content.startsWith('http') && 
          (msg.content.includes('.jpg') || 
           msg.content.includes('.jpeg') || 
           msg.content.includes('.png') || 
           msg.content.includes('.gif') || 
           msg.content.includes('cloudinary'));
        
        return {
          ...msg,
          text: isImageContent ? '' : msg.content, // Si es imagen, no mostrar texto
          image_url: isImageContent ? msg.content : null // Si content parece una URL de imagen, asignarla a image_url
        };
      });
      
      return transformedMessages;
    }

    return data || [];
  } catch (error) {
    console.error('Error inesperado obteniendo conversación:', error);
    throw error;
  }
};

// Función para marcar mensajes como leídos
export const markMessagesAsRead = async (receiverId: string, senderId: string): Promise<void> => {
  try {
    console.log(`Marcando mensajes como leídos: De ${senderId} a ${receiverId}`);

    const { error } = await supabase
      .from('messages')
      .update({ read: true })
      .eq('receiver_id', receiverId)
      .eq('sender_id', senderId)
      .eq('read', false);

    if (error) {
      console.error('Error marcando mensajes como leídos:', error);
      throw error;
    }

    console.log(`Mensajes de ${senderId} a ${receiverId} marcados como leídos`);
  } catch (error) {
    console.error('Error inesperado marcando mensajes como leídos:', error);
    throw error;
  }
};

// Función para suscribirse a nuevos mensajes
export const subscribeToMessages = (
  userId: string,
  onNewMessage: (message: Message) => void,
  friendId?: string
) => {
  try {
    // Usar un canal más simple sin IDs para evitar colisiones y errores
    const channelName = `messages_user_${userId}_${Date.now()}`;

    console.log(`Creando suscripción a canal: ${channelName}`);
  
    // Creamos un canal único para este usuario
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        (payload: { new: Message }) => {
          const message = payload.new;
          console.log('Mensaje recibido:', message);
          
          // Verificar si el mensaje pertenece a la conversación que nos interesa
          const isRelevantMessage = friendId
            ? (message.sender_id === userId && message.receiver_id === friendId) ||
            (message.sender_id === friendId && message.receiver_id === userId)
            : message.sender_id === userId || message.receiver_id === userId;
          
          if (isRelevantMessage) {
            onNewMessage(message);
          }
        }
      )
      .subscribe();
    
    // Devolver función para desuscribirse
    return () => {
      console.log(`Desuscribiendo del canal ${channelName}`);
      supabase.removeChannel(channel);
    };
  } catch (error) {
    console.error('Error al configurar suscripción:', error);
    // Retornar un objeto con método unsubscribe para evitar errores
    return () => console.log('Nada que desuscribir (suscripción falló)');
  }
};

// Función para obtener las conversaciones recientes
export const getRecentConversations = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .rpc('get_recent_conversations', {
        user_id: userId
      });

    if (error) {
      console.error('Error obteniendo conversaciones recientes:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error inesperado obteniendo conversaciones recientes:', error);
    throw error;
  }
};

// Función para contar mensajes no leídos
export const countUnreadMessages = async (userId: string): Promise<number> => {
  try {
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', userId)
      .eq('read', false);

    if (error) {
      console.error('Error contando mensajes no leídos:', error);
      throw error;
    }

    return count || 0;
  } catch (error) {
    console.error('Error inesperado contando mensajes no leídos:', error);
    throw error;
  }
};

// Función para enviar notificación de mensaje nuevo
export async function sendNewMessageNotification(
  receiverId: string, 
  senderName: string, 
  messagePreview: string,
  senderId: string
) {
  return sendPushNotification(
    receiverId,
    `Mensaje de ${senderName}`,
    messagePreview.length > 50 ? messagePreview.substring(0, 47) + '...' : messagePreview,
    { 
      type: 'new_message', 
      senderId: senderId,
      senderName: senderName 
    }
  );
}

// Función para enviar un mensaje a un grupo
export const sendGroupMessage = async (
  groupId: string, 
  text: string,
  imageUrl?: string | null
): Promise<Message | null> => {
  try {
    console.log(`Enviando mensaje a grupo ${groupId}: ${text.substring(0, 20)}...`);
    
    // Obtener ID del usuario autenticado
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('No hay sesión de usuario');
    }
    
    const userId = session.user.id;
    
    // Obtener información del usuario remitente
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('username')
      .eq('id', userId)
      .single();
      
    if (userError) {
      console.error('Error obteniendo datos del usuario:', userError);
      return null;
    }
    
    // Crear el mensaje
    const { data, error } = await supabase
      .from('group_messages')
      .insert({
        sender_id: userId,
        group_id: groupId,
        text: text,
        image_url: imageUrl,
        created_at: new Date().toISOString(),
        read: false,
        sender_username: userData.username
      })
      .select()
      .single();
      
    if (error) {
      console.error('Error enviando mensaje de grupo:', error);
      throw error;
    }
    
    // Obtener los miembros del grupo para enviar notificaciones
    const { data: members, error: membersError } = await supabase
      .from('group_members')
      .select('user_id')
      .eq('group_id', groupId)
      .eq('status', 'accepted');
      
    if (membersError) {
      console.error('Error obteniendo miembros del grupo:', membersError);
    } else if (members) {
      // Enviar notificación a cada miembro del grupo (excepto al remitente)
      for (const member of members) {
        if (member.user_id !== userId) {
          try {
            // Obtener nombre del grupo
            const { data: groupData } = await supabase
              .from('groups')
              .select('name')
              .eq('id', groupId)
              .single();
              
            const groupName = groupData?.name || 'Grupo';
            
            // Enviar notificación
            await sendPushNotification(
              member.user_id,
              `${groupName}`,
              `${userData.username}: ${text.length > 40 ? text.substring(0, 37) + '...' : text}`,
              {
                type: 'group_message',
                groupId,
                senderId: userId,
                senderName: userData.username
              }
            );
          } catch (notifError) {
            console.error('Error enviando notificación a miembro del grupo:', notifError);
          }
        }
      }
    }
    
    return data;
  } catch (error) {
    console.error('Error inesperado enviando mensaje de grupo:', error);
    return null;
  }
};

// Función para obtener los mensajes de un grupo
export const getGroupMessages = async (groupId: string): Promise<Message[]> => {
  try {
    console.log(`Obteniendo mensajes del grupo ${groupId}`);
    
    const { data, error } = await supabase
      .from('group_messages')
      .select(`
        id,
        sender_id,
        group_id,
        text,
        image_url,
        created_at,
        read,
        sender_username
      `)
      .eq('group_id', groupId)
      .order('created_at', { ascending: true });
      
    if (error) {
      console.error('Error obteniendo mensajes del grupo:', error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      console.log(`No hay mensajes en el grupo ${groupId}`);
      return [];
    }
    
    console.log(`Se encontraron ${data.length} mensajes en el grupo ${groupId}`);
    
    // Obtener nombres de usuario si no están incluidos
    const messagesWithUsernames = await Promise.all(data.map(async (message) => {
      if (!message.sender_username) {
        try {
          const userInfo = await getUserInfoById(message.sender_id);
          return {
            ...message,
            sender_username: userInfo?.username || 'Usuario desconocido'
          };
        } catch (error) {
          console.error('Error obteniendo nombre de usuario:', error);
          return {
            ...message,
            sender_username: 'Usuario desconocido'
          };
        }
      }
      return message;
    }));
    
    return messagesWithUsernames;
  } catch (error) {
    console.error('Error inesperado obteniendo mensajes del grupo:', error);
    return [];
  }
};

// Función para suscribirse a mensajes de un grupo específico
export const subscribeToGroupMessages = (
  groupId: string,
  onNewMessage: (message: Message) => void
) => {
  try {
    console.log(`Creando suscripción a mensajes del grupo ${groupId}`);
    
    const channelName = `group_messages_${groupId}`;
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'group_messages',
          filter: `group_id=eq.${groupId}`
        },
        (payload: { new: Message }) => {
          console.log('Nuevo mensaje de grupo recibido:', payload.new);
          onNewMessage(payload.new);
        }
      )
      .subscribe();
      
    // Devolver la función para desuscribirse
    return () => {
      supabase.removeChannel(channel);
    };
  } catch (error) {
    console.error('Error creando suscripción a mensajes de grupo:', error);
    return () => {}; // Función vacía como fallback
  }
};

// Función para obtener las conversaciones recientes de grupos
export const getRecentGroupConversations = async (userId: string) => {
  try {
    // Primero obtenemos los grupos a los que pertenece el usuario
    const { data: memberGroups, error: memberError } = await supabase
      .from('group_members')
      .select(`
        group_id,
        groups(
          id,
          name,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'accepted');

    if (memberError) {
      console.error('Error obteniendo grupos del usuario:', memberError);
      return [];
    }

    if (!memberGroups || memberGroups.length === 0) {
      return [];
    }

    // Para cada grupo, obtenemos el último mensaje
    const groupConversations = await Promise.all(
      memberGroups.map(async (membership) => {
        const groupId = membership.group_id;
        const groupInfo = membership.groups;

        try {
          // Obtener el último mensaje del grupo
          const { data: lastMessage, error: messageError } = await supabase
            .from('group_messages')
            .select('*')
            .eq('group_id', groupId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (messageError) {
            // Si no hay mensajes, devolvemos info básica del grupo
            return {
              conversation_id: groupId,
              is_group: true,
              name: groupInfo.name,
              last_message: '',
              created_at: groupInfo.updated_at || groupInfo.created_at,
              unread_count: 0
            };
          }

          // Contar mensajes no leídos
          const { count: unreadCount, error: countError } = await supabase
            .from('group_messages')
            .select('id', { count: 'exact', head: true })
            .eq('group_id', groupId)
            .eq('read', false)
            .neq('sender_id', userId);

          return {
            conversation_id: groupId,
            is_group: true,
            name: groupInfo.name,
            last_message: lastMessage.text || '(Imagen)',
            created_at: lastMessage.created_at,
            unread_count: unreadCount || 0,
            last_message_sender: lastMessage.sender_username || 'Usuario'
          };
        } catch (error) {
          console.error(`Error procesando grupo ${groupId}:`, error);
          return null;
        }
      })
    );

    // Filtrar los null y ordenar por fecha más reciente
    return groupConversations
      .filter(Boolean)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch (error) {
    console.error('Error obteniendo conversaciones de grupos:', error);
    return [];
  }
};

// Función para obtener todas las conversaciones recientes (directas y grupales)
export const getAllConversations = async (userId: string) => {
  try {
    // Obtener conversaciones directas
    const directConversations = await getRecentConversations(userId);
    
    // Transformar para tener el mismo formato que las conversaciones grupales
    const formattedDirectConvs = directConversations.map(conv => ({
      conversation_id: conv.conversation_user_id,
      is_group: false,
      name: conv.username || 'Usuario',
      last_message: conv.last_message || '',
      created_at: conv.created_at,
      unread_count: conv.unread_count || 0
    }));

    // Obtener conversaciones grupales
    const groupConversations = await getRecentGroupConversations(userId);

    // Combinar y ordenar por fecha más reciente
    const allConversations = [...formattedDirectConvs, ...groupConversations]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return allConversations;
  } catch (error) {
    console.error('Error obteniendo todas las conversaciones:', error);
    return [];
  }
};

// Función para marcar mensajes grupales como leídos
export const markGroupMessagesAsRead = async (groupId: string, userId: string): Promise<void> => {
  try {
    console.log(`Marcando mensajes del grupo ${groupId} como leídos para usuario ${userId}`);
    
    const { error } = await supabase
      .from('group_messages')
      .update({ read: true })
      .eq('group_id', groupId)
      .neq('sender_id', userId)
      .eq('read', false);

    if (error) {
      console.error('Error marcando mensajes grupales como leídos:', error);
      throw error;
    }
    
    console.log(`Mensajes de grupo ${groupId} marcados como leídos`);
  } catch (error) {
    console.error('Error inesperado marcando mensajes grupales como leídos:', error);
    throw error;
  }
}; 