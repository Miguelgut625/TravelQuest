import { Linking } from 'react-native';
import type { LinkingOptions } from '@react-navigation/native';
import { RootStackParamList } from './types';

export const linking: LinkingOptions<RootStackParamList> = {
    prefixes: ['travelquest://', 'https://travelquest.com'],
    config: {
        screens: {
            ResetPassword: {
                path: 'reset-password',
                parse: {
                    token: (url: string) => url.split('token=')[1]?.split('&')[0] || '',
                }
            },
            EmailSent: 'email-sent',
            Login: 'login',
            Register: 'register',
            Main: {
                screens: {
                    Map: 'map',
                    Missions: 'missions',
                    Journal: 'journal',
                    Profile: 'profile',
                },
            },
        },
    },
    async getInitialURL() {
        const url = await Linking.getInitialURL();
        if (url != null) {
            return url;
        }
        return null;
    },
    subscribe(listener: (url: string) => void) {
        const onReceiveURL = ({ url }: { url: string }) => listener(url);
        const subscription = Linking.addEventListener('url', onReceiveURL);
        return () => {
            subscription.remove();
        };
    },
}; 