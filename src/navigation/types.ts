export type RootStackParamList = {
    Login: undefined;
    Register: undefined;
    Main: undefined;
    EmailSent: undefined;
    ForgotPassword: undefined;
    VerifyCode: { email: string };
    VerifyEmail: { email: string };
    ResetPassword: undefined;
    Profile: undefined;
    Settings: undefined;
    Missions: {
        journeyId?: string;
        challenges?: any[];
    };
    Journal: {
        refresh?: boolean;
    };
    // Añade aquí más pantallas según sea necesario
}; 