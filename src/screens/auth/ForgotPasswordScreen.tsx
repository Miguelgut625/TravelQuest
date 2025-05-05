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
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import axios from 'axios';

// URL base de la API
const API_URL = 'http://192.168.1.5:5000/api';

type ForgotPasswordScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const ForgotPasswordScreen = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const navigation = useNavigation<ForgotPasswordScreenNavigationProp>();

    const handleSendCode = async () => {
        if (!email) {
            Alert.alert('Error', 'Por favor, ingresa tu correo electrónico');
            return;
        }

        setLoading(true);

        try {
            // Llamada a la API para solicitar recuperación de contraseña
            const response = await axios.post(`${API_URL}/users/forgot-password`, { email });

            // Si llegamos aquí, el envío fue exitoso
            Alert.alert(
                'Código enviado',
                'Se ha enviado un código de recuperación a tu correo electrónico',
                [
                    {
                        text: 'OK',
                        onPress: () => navigation.navigate('VerifyCode', { email })
                    }
                ]
            );
        } catch (error) {
            console.error('Error al enviar código de recuperación:', error);
            
            if (error.response) {
                // Error de respuesta del servidor
                Alert.alert('Error', error.response.data.error || 'Ocurrió un error al enviar el código de recuperación');
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
            <Text style={styles.title}>Recuperar Contraseña</Text>
            <Text style={styles.subtitle}>
                Ingresa tu correo electrónico para recibir un código de verificación
            </Text>

            <TextInput
                style={styles.input}
                placeholder="Correo electrónico"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
            />

            <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleSendCode}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color="white" />
                ) : (
                    <Text style={styles.buttonText}>Enviar Código</Text>
                )}
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => navigation.navigate('Login')}
            >
                <Text style={styles.cancelButtonText}>Volver al Login</Text>
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
    },
    button: {
        backgroundColor: '#005F9E',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 10,
    },
    buttonDisabled: {
        backgroundColor: '#78909C',
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
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

export default ForgotPasswordScreen; 