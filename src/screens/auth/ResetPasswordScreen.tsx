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

type ResetPasswordScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

type RouteParams = {
    session?: any;
};

export const ResetPasswordScreen = () => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const navigation = useNavigation<ResetPasswordScreenNavigationProp>();
    const route = useRoute();
    const { session } = route.params as RouteParams || {};

    const handleResetPassword = async () => {
        if (!newPassword || !confirmPassword) {
            Alert.alert('Error', 'Por favor, completa todos los campos');
            return;
        }

        if (newPassword !== confirmPassword) {
            Alert.alert('Error', 'Las contraseñas no coinciden');
            return;
        }

        if (newPassword.length < 6) {
            Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
            return;
        }

        setLoading(true);

        try {
            // Configurar el token de autenticación si está disponible desde la sesión
            const headers = {};
            if (session && session.access_token) {
                headers['Authorization'] = `Bearer ${session.access_token}`;
            }
            
            // Llamada a la API para cambiar la contraseña
            const response = await axios.post(`${API_URL}/users/reset-password`, 
                { newPassword },
                { headers }
            );

            // Si llegamos aquí, la contraseña se cambió correctamente
            Alert.alert(
                'Éxito', 
                'Tu contraseña ha sido actualizada correctamente',
                [
                    {
                        text: 'OK',
                        onPress: () => navigation.navigate('Login')
                    }
                ]
            );
        } catch (error) {
            console.error('Error al cambiar contraseña:', error);
            
            if (error.response) {
                // Error de respuesta del servidor
                if (error.response.status === 401) {
                    Alert.alert(
                        'Error',
                        'Tu sesión ha expirado. Por favor, vuelve a iniciar el proceso de recuperación de contraseña',
                        [
                            {
                                text: 'OK',
                                onPress: () => navigation.navigate('Login')
                            }
                        ]
                    );
                } else {
                    Alert.alert('Error', error.response.data.error || 'Ocurrió un error al cambiar la contraseña');
                }
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
            <Text style={styles.title}>Cambiar Contraseña</Text>
            <Text style={styles.subtitle}>
                Por favor, ingresa tu nueva contraseña
            </Text>

            <TextInput
                style={styles.input}
                placeholder="Nueva contraseña"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
            />

            <TextInput
                style={styles.input}
                placeholder="Confirmar contraseña"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
            />

            <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleResetPassword}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color="white" />
                ) : (
                    <Text style={styles.buttonText}>Cambiar Contraseña</Text>
                )}
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
    cancelButton: {
        marginTop: 20,
        alignItems: 'center',
    },
    cancelButtonText: {
        color: '#666',
        fontSize: 16,
    },
});

export default ResetPasswordScreen; 