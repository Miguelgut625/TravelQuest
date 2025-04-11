import React, { useEffect, useRef, useCallback } from 'react';
import { Mission } from '../types/missions';
import { User } from '../types/user';
import NotificationService from '../services/NotificationService';
import { supabase } from '../lib/supabase';

const notificationService = NotificationService.getInstance();

// Interfaz para el estado de las notificaciones
interface NotificationState {
    [missionId: string]: {
        lastNotificationTime: number;
        hoursLeft: number;
        notified: boolean;
    };
}

const MissionsScreen: React.FC = () => {
    const [missions, setMissions] = React.useState<Mission[]>([]);
    const [user, setUser] = React.useState<User | null>(null);
    const notificationState = useRef<NotificationState>({});
    const isChecking = useRef(false);

    const checkAndNotifyMission = useCallback(async (mission: Mission, userId: string) => {
        try {
            const now = new Date();
            const endDate = new Date(mission.end_date);
            const hoursLeft = Math.floor((endDate.getTime() - now.getTime()) / (1000 * 60 * 60));
            
            // Verificar si la misión está por expirar y no está completada
            if (hoursLeft <= 24 && hoursLeft > 0 && !mission.completed) {
                // Verificar si ya existe una notificación (leída o no) para esta misión en las últimas 24 horas
                const { data: existingNotification } = await supabase
                    .from('notifications')
                    .select('id, read, created_at')
                    .eq('userid', userId)
                    .eq('type', 'journey_ending')
                    .eq('data->>journeyDescription', mission.description)
                    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                // Si no hay notificación existente en las últimas 24 horas, crear una nueva
                if (!existingNotification) {
                    await notificationService.notifyJourneyEnding(
                        userId,
                        mission.description,
                        hoursLeft
                    );
                }
            }
        } catch (error) {
            console.error('Error al verificar misión:', error);
        }
    }, []);

    const checkExpiringMissions = async (missions: Mission[], userId: string) => {
        try {
            const now = new Date();
            
            // Verificar cada misión
            for (const mission of missions) {
                const endDate = new Date(mission.end_date);
                const hoursLeft = Math.floor((endDate.getTime() - now.getTime()) / (1000 * 60 * 60));
                
                // Solo verificar misiones no completadas
                if (!mission.completed) {
                    // Verificar si estamos en uno de los momentos específicos
                    if (hoursLeft === 24 || hoursLeft === 12 || hoursLeft === 1) {
                        await notificationService.notifyJourneyEnding(
                            userId,
                            mission.description,
                            hoursLeft
                        );
                    }
                }
            }
        } catch (error) {
            console.error('Error al verificar misiones expirando:', error);
        }
    };

    // Verificar misiones cuando cambian
    useEffect(() => {
        if (missions.length > 0 && user?.id) {
            checkExpiringMissions(missions, user.id);
        }
    }, [missions, user?.id, checkExpiringMissions]);

    // Suscribirse a cambios en las notificaciones
    useEffect(() => {
        if (!user?.id) return;

        const subscription = supabase
            .channel('notifications')
            .on('postgres_changes', 
                { 
                    event: 'INSERT', 
                    schema: 'public', 
                    table: 'notifications',
                    filter: `userid=eq.${user.id}`
                }, 
                () => {
                    // Cuando se inserta una nueva notificación, verificar las misiones
                    if (missions.length > 0) {
                        checkExpiringMissions(missions, user.id);
                    }
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [user?.id, missions, checkExpiringMissions]);

    return (
        <div>
            {/* Render your component content here */}
        </div>
    );
};

export default MissionsScreen; 