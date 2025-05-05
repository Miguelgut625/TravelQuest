// @ts-ignore - importación con problemas de tipos
import { Linking } from 'react-native';

export const linking = {
    prefixes: ['travelquest://', 'https://travelquest.com'],
    config: {
        screens: {
            ResetPassword: {
                path: 'reset-password',
                parse: (url: string) => {
                    const token = url.split('token=')[1]?.split('&')[0];
                    return { token };
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
                    Groups: 'groups',
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