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
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error inesperado enviando mensaje:', error);
    return null;
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
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error inesperado obteniendo conversación:', error);
    return [];
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
    }
  } catch (error) {
    console.error('Error inesperado marcando mensajes como leídos:', error);
  }
};

// Función para suscribirse a nuevos mensajes
export const subscribeToMessages = (
  userId: string,
  onNewMessage: (message: Message) => void,
  friendId?: string
) => {
  // Si tenemos un friendId, nos suscribimos a mensajes entre dos usuarios específicos
  if (friendId) {
    return supabase
      .channel(`messages-channel-${userId}-${friendId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `and(or(sender_id.eq.${userId},sender_id.eq.${friendId}),or(receiver_id.eq.${userId},receiver_id.eq.${friendId}))`,
        },
        (payload: { new: Message }) => {
          // Verificar que el mensaje es parte de la conversación entre estos dos usuarios
          const newMsg = payload.new;
          if (
            (newMsg.sender_id === userId && newMsg.receiver_id === friendId) ||
            (newMsg.sender_id === friendId && newMsg.receiver_id === userId)
          ) {
            console.log('Nuevo mensaje en conversación específica:', newMsg);
            onNewMessage(newMsg);
          }
        }
      )
      .subscribe();
  }

  // Suscripción general a todos los mensajes donde el usuario es receptor
  return supabase
    .channel(`messages-channel-${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `receiver_id=eq.${userId}`,
      },
      (payload: { new: Message }) => {
        console.log('Nuevo mensaje recibido:', payload.new);
        onNewMessage(payload.new);
      }
    )
    .subscribe();
};

// Función para obtener las conversaciones recientes
export const getRecentConversations = async (userId: string) => {
  try {
    // Obtenemos los mensajes más recientes para cada conversación
    const { data, error } = await supabase
      .rpc('get_recent_conversations', {
        user_id: userId
      });

    if (error) {
      console.error('Error obteniendo conversaciones recientes:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error inesperado obteniendo conversaciones recientes:', error);
    return [];
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
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error inesperado contando mensajes no leídos:', error);
    return 0;
  }
}; 