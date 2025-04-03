import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { supabase } from '../../services/supabase';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import styles from './style'; // Importamos los estilos

type VerifyCodeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

type RouteParams = {
    email: string;
};

export const VerifyCodeScreen = () => {
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const navigation = useNavigation<VerifyCodeScreenNavigationProp>();
    const route = useRoute();
    const { email } = route.params as RouteParams;

    const handleVerifyCode = async () => {
        if (!code) {
            Alert.alert('Error', 'Por favor, ingresa el código de verificación');
            return;
        }

        setLoading(true);

        try {
            const { error } = await supabase.auth.verifyOtp({
                email,
                token: code,
                type: 'email'
            });

            if (error) {
                Alert.alert('Error', error.message);
                return;
            }

            // Si el código es correcto, navegamos a la pantalla de cambio de contraseña
            navigation.navigate('ResetPassword');
        } catch (error) {
            console.error('Error al verificar código:', error);
            Alert.alert('Error', 'Ocurrió un error al verificar el código');
        } finally {
            setLoading(false);
        }
    };

    const handleResendCode = async () => {
        setLoading(true);

        try {
            const { error } = await supabase.auth.signInWithOtp({
                email,
                options: {
                    shouldCreateUser: false
                }
            });

            if (error) {
                Alert.alert('Error', error.message);
                return;
            }

            Alert.alert('Éxito', 'Se ha enviado un nuevo código a tu correo electrónico');
        } catch (error) {
            console.error('Error al reenviar código:', error);
            Alert.alert('Error', 'Ocurrió un error al reenviar el código');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Verificar Código</Text>
            <Text style={styles.subtitle}>
                Por favor, ingresa el código que hemos enviado a tu correo electrónico
            </Text>

            <TextInput
                style={styles.input}
                placeholder="Código de verificación"
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                maxLength={6}
            />

            <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleVerifyCode}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color="white" />
                ) : (
                    <Text style={styles.buttonText}>Verificar Código</Text>
                )}
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.resendButton}
                onPress={handleResendCode}
                disabled={loading}
            >
                <Text style={styles.resendButtonText}>Reenviar Código</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => navigation.navigate('Login')}
            >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
        </View>
    );
};

export default VerifyCodeScreen; 