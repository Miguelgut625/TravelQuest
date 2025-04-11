import { supabase } from './supabase';

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  read: boolean;
}

// Función para enviar un mensaje
export const sendMessage = async (senderId: string, receiverId: string, content: string): Promise<Message | null> => {
  try {
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
    return data;
  } catch (error) {
    console.error('Error inesperado enviando mensaje:', error);
    throw error;
  }
};

// Función para obtener los mensajes entre dos usuarios
export const getConversation = async (userId1: string, userId2: string): Promise<Message[]> => {
  try {
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
    return data || [];
  } catch (error) {
    console.error('Error inesperado obteniendo conversación:', error);
    throw error;
  }
};

// Función para marcar mensajes como leídos
export const markMessagesAsRead = async (receiverId: string, senderId: string): Promise<void> => {
  try {
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
  // Crear un nombre único para el canal basado en los IDs
  const channelName = friendId ? 
    `messages-channel-${[userId, friendId].sort().join('-')}` : 
    `messages-channel-${userId}`;

  console.log(`Creando suscripción a canal: ${channelName}`);

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: friendId ? 
          `or(and(sender_id.eq.${userId},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${userId}))` :
          `or(sender_id.eq.${userId},receiver_id.eq.${userId})`
      },
      (payload: { new: Message }) => {
        console.log('Nuevo mensaje recibido en suscripción:', payload.new);
        onNewMessage(payload.new);
      }
    )
    .subscribe((status) => {
      console.log(`Estado de suscripción a canal ${channelName}:`, status);
      
      // Registrar errores de conexión si los hay
      if (status === 'CHANNEL_ERROR') {
        console.error(`Error en canal ${channelName}. Reconectando...`);
        
        // Intentar reconectar después de un breve retraso
        setTimeout(() => {
          channel.subscribe();
        }, 2000);
      }
      
      if (status === 'SUBSCRIBED') {
        console.log(`Canal ${channelName} suscrito correctamente`);
      }
    });

  return channel;
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