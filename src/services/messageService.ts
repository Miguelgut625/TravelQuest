import { supabase } from './supabase';
import { uploadImageToCloudinary } from './cloudinaryService';
import { sendPushNotification } from './NotificationService';
import NotificationService from './NotificationService';

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  read: boolean;
}

// Función para enviar un mensaje de texto
export const sendMessage = async (senderId: string, receiverId: string, content: string): Promise<Message | null> => {
  try {
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
        const notificationService = NotificationService.getInstance();
        await notificationService.notifyNewMessage(
          receiverId,
          senderId,
          senderData.username || 'Usuario',
          content
        ).catch(notifError => {
          console.error('Error enviando notificación push:', notifError);
        });
      }
    } catch (userError) {
      console.error('Error obteniendo datos del remitente:', userError);
    }

    return data;
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
        const notificationService = NotificationService.getInstance();
        await notificationService.notifyNewMessage(
          receiverId,
          senderId,
          senderData.username || 'Usuario',
          '📷 Te ha enviado una imagen'
        ).catch(notifError => {
          console.error('Error enviando notificación push:', notifError);
        });
      }
    } catch (userError) {
      console.error('Error obteniendo datos del remitente:', userError);
    }

    console.log('Mensaje con imagen enviado con éxito:', data);
    return data;
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
    // Crear un nombre único para el canal basado en los IDs
    const sortedIds = [userId, friendId].filter(Boolean).sort();
    const channelName = `messages_${sortedIds.join('_')}`;

    console.log(`Creando suscripción a canal: ${channelName}`);

    // Verificar si ya existe un canal con este nombre y eliminarlo primero
    try {
      const existingChannels = supabase.getChannels();
      const existingChannel = existingChannels.find(ch => ch.topic === channelName);
      if (existingChannel) {
        console.log(`Canal existente encontrado, limpiando primero: ${channelName}`);
        supabase.removeChannel(existingChannel);
      }
    } catch (error) {
      console.warn('Error al verificar canales existentes:', error);
    }

    // Crear un nuevo canal con un pequeño retraso para asegurar limpieza
    setTimeout(() => {
      // Definir el filtro de forma directa para evitar problemas con caracteres especiales
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            // No usar filter para evitar problemas, hacemos el filtrado manual
            filter: ''
          },
          (payload: { new: Message }) => {
            const message = payload.new;
            console.log('Mensaje recibido en canal:', message);

            // Verificar si el mensaje pertenece a la conversación que nos interesa
            const isRelevantMessage = friendId
              ? (message.sender_id === userId && message.receiver_id === friendId) ||
                (message.sender_id === friendId && message.receiver_id === userId)
              : message.sender_id === userId || message.receiver_id === userId;

            console.log(`¿Mensaje relevante para ${userId}? ${isRelevantMessage}`);

            if (isRelevantMessage) {
              onNewMessage(message);
            }
          }
        )
        .subscribe((status) => {
          console.log(`Estado de suscripción a canal ${channelName}:`, status);

          if (status === 'SUBSCRIBED') {
            console.log(`✅ Canal ${channelName} suscrito correctamente`);
          }

          if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            console.error(`❌ Error en canal ${channelName}, intentando reconectar...`);
            // No intentamos reconectar aquí para evitar bucles
          }
        });

      // Devolver un objeto con método unsubscribe que limpia correctamente
      return {
        unsubscribe: () => {
          try {
            console.log(`Limpiando suscripción a canal: ${channelName}`);
            supabase.removeChannel(channel);
          } catch (cleanupError) {
            console.error('Error al limpiar canal:', cleanupError);
          }
        }
      };
    }, 100);

    // Devolver un objeto temporal hasta que se complete la creación real
    return {
      unsubscribe: () => console.log(`Limpiando suscripción temporal a canal: ${channelName}`)
    };
  } catch (error) {
    console.error('Error al configurar suscripción:', error);
    // Retornar un objeto con método unsubscribe para evitar errores
    return {
      unsubscribe: () => console.log('Nada que desuscribir (suscripción falló)')
    };
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

// Suscripción a mensajes de grupo en tiempo real
export const subscribeToGroupMessages = (
  groupId: string,
  onNewMessage: (message: any) => void
) => {
  // Nombre único para el canal del grupo
  const channelName = `group_messages_${groupId}`;
  console.log(`Creando suscripción a canal de grupo: ${channelName}`);

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
      (payload) => {
        if (payload.new) {
          onNewMessage(payload.new);
        }
      }
    )
    .subscribe();

  // Devuelve un objeto con método unsubscribe para limpiar la suscripción
  return {
    unsubscribe: () => {
      supabase.removeChannel(channel);
    }
  };
};

// Función para enviar un mensaje a un grupo
export const sendGroupMessage = async (
  groupId: string,
  senderId: string,
  text: string | null,
  imageUrl: string | null,
  senderUsername: string
): Promise<any> => {
  try {
    console.log(`Enviando mensaje de grupo: De ${senderId} al grupo ${groupId}`);

    const { data, error } = await supabase
      .from('group_messages')
      .insert({
        group_id: groupId,
        sender_id: senderId,
        text: text,
        image_url: imageUrl,
        sender_username: senderUsername,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error enviando mensaje de grupo:', error);
      throw error;
    }

    console.log('Mensaje de grupo enviado con éxito:', data);
    return data;
  } catch (error) {
    console.error('Error inesperado enviando mensaje de grupo:', error);
    throw error;
  }
};

// Función para obtener los mensajes de un grupo
export const getGroupMessages = async (groupId: string): Promise<any[]> => {
  try {
    console.log(`Obteniendo mensajes del grupo ${groupId}`);

    const { data, error } = await supabase
      .from('group_messages')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error obteniendo mensajes del grupo:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error inesperado obteniendo mensajes del grupo:', error);
    throw error;
  }
};

// Función para marcar mensajes de grupo como leídos
export const markGroupMessagesAsRead = async (groupId: string, userId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('group_messages')
      .update({ read: true })
      .eq('group_id', groupId)
      .eq('read', false);

    if (error) {
      console.error('Error marcando mensajes como leídos:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error inesperado marcando mensajes como leídos:', error);
    throw error;
  }
}; 