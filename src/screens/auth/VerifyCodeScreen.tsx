import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import axios from 'axios';
import { API_URL } from '../../config/api';

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
            // Llamada a la API para verificar el código
            const response = await axios.post(`${API_URL}/users/verify-code`, {
                email,
                token: code
            });

            // Si llegamos aquí, el código es correcto
            Alert.alert(
                'Verificación exitosa',
                'Código verificado correctamente',
                [
                    {
                        text: 'OK',
                        onPress: () => navigation.navigate('ResetPassword', { session: response.data.session })
                    }
                ]
            );
        } catch (error) {
            console.error('Error al verificar código:', error);
            
            if (error.response) {
                // Error de respuesta del servidor
                Alert.alert('Error', error.response.data.error || 'Código de verificación inválido');
            } else if (error.request) {
                // Error de red o servidor no disponible
                Alert.alert('Error', 'No se pudo conectar con el servidor. Verifica tu conexión a internet.');
            } else {
                // Error inesperado
                Alert.alert('Error', 'Ocurrió un error inesperado');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleResendCode = async () => {
        setLoading(true);

        try {
            // Llamada a la API para reenviar el código
            const response = await axios.post(`${API_URL}/users/forgot-password`, { email });

            Alert.alert('Éxito', 'Se ha enviado un nuevo código a tu correo electrónico');
        } catch (error) {
            console.error('Error al reenviar código:', error);
            
            if (error.response) {
                // Error de respuesta del servidor
                Alert.alert('Error', error.response.data.error || 'Ocurrió un error al reenviar el código');
            } else if (error.request) {
                // Error de red o servidor no disponible
                Alert.alert('Error', 'No se pudo conectar con el servidor. Verifica tu conexión a internet.');
            } else {
                // Error inesperado
                Alert.alert('Error', 'Ocurrió un error inesperado');
            }
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

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        justifyContent: 'center',
        backgroundColor: '#f5f5f5',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 10,
        textAlign: 'center',
        color: '#333',
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        marginBottom: 20,
        textAlign: 'center',
    },
    input: {
        backgroundColor: 'white',
        padding: 15,
        borderRadius: 10,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#ddd',
        textAlign: 'center',
        fontSize: 20,
        letterSpacing: 5,
    },
    button: {
        backgroundColor: '#4CAF50',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 10,
    },
    buttonDisabled: {
        backgroundColor: '#cccccc',
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    resendButton: {
        marginTop: 15,
        padding: 10,
        alignItems: 'center',
    },
    resendButtonText: {
        color: '#4CAF50',
        fontSize: 16,
    },
    cancelButton: {
        marginTop: 20,
        alignItems: 'center',
    },
    cancelButtonText: {
        color: '#666',
        fontSize: 16,
    },
});

export default VerifyCodeScreen; 