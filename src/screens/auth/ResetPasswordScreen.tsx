import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useDispatch } from 'react-redux';
import { setUser, setToken } from '../../features/authSlice';
import { supabase } from '../../services/supabase';

const ResetPasswordScreen = ({ navigation }: any) => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const dispatch = useDispatch();

    const handleResetPassword = async () => {
        if (!newPassword || !confirmPassword) {
            setMessage({ type: 'error', text: 'Por favor completa todos los campos' });
            return;
        }

        if (newPassword.length < 6) {
            setMessage({ type: 'error', text: 'La contraseña debe tener al menos 6 caracteres' });
            return;
        }

        if (newPassword !== confirmPassword) {
            setMessage({ type: 'error', text: 'Las contraseñas no coinciden' });
            return;
        }

        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            const { data, error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) {
                // Manejar específicamente el error de contraseña igual a la anterior en español
                if (error.message.includes('New password should be different from the old password')) {
                    throw new Error('La contraseña nueve debe ser diferente a la anterior');
                }
                throw error;
            }

            // Obtener la sesión actual después de actualizar la contraseña
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();

            if (sessionError) throw sessionError;

            if (session) {
                // Actualizar el estado de autenticación en Redux
                dispatch(setUser({
                    id: session.user.id,
                    email: session.user.email!,
                    username: session.user.user_metadata.username || session.user.email!.split('@')[0],
                }));
                dispatch(setToken(session.access_token));

                setMessage({
                    type: 'success',
                    text: 'Tu contraseña ha sido actualizada correctamente'
                });

                // Redirigir a la pantalla principal después de 2 segundos
                setTimeout(() => {
                    navigation.replace('Main');
                }, 2000);
            }

        } catch (error: any) {
            console.error('Error al actualizar contraseña:', error);
            setMessage({
                type: 'error',
                text: error.message || 'Error al actualizar la contraseña'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Nueva Contraseña</Text>

            {message.text ? (
                <Text style={[
                    styles.messageText,
                    message.type === 'error' ? styles.errorMessage : styles.successMessage
                ]}>
                    {message.text}
                </Text>
            ) : null}

            <TextInput
                style={styles.input}
                placeholder="Nueva contraseña"
                value={newPassword}
                onChangeText={(text) => {
                    setNewPassword(text);
                    setMessage({ type: '', text: '' });
                }}
                secureTextEntry
            />

            <TextInput
                style={styles.input}
                placeholder="Confirmar nueva contraseña"
                value={confirmPassword}
                onChangeText={(text) => {
                    setConfirmPassword(text);
                    setMessage({ type: '', text: '' });
                }}
                secureTextEntry
            />

            <TouchableOpacity
                style={[styles.button, loading && styles.disabledButton]}
                onPress={handleResetPassword}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color="white" />
                ) : (
                    <Text style={styles.buttonText}>Guardar Nueva Contraseña</Text>
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
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#f5f5f5',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 30,
        color: '#333',
    },
    input: {
        width: '100%',
        height: 50,
        backgroundColor: 'white',
        borderRadius: 10,
        paddingHorizontal: 15,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    button: {
        width: '100%',
        height: 50,
        backgroundColor: '#4CAF50',
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    cancelButton: {
        marginTop: 15,
        padding: 10,
    },
    cancelButtonText: {
        color: '#666',
        fontSize: 14,
    },
    messageText: {
        textAlign: 'center',
        marginBottom: 20,
        padding: 10,
        borderRadius: 5,
        width: '100%',
    },
    errorMessage: {
        backgroundColor: '#ffebee',
        color: '#c62828',
    },
    successMessage: {
        backgroundColor: '#e8f5e9',
        color: '#2e7d32',
    },
    disabledButton: {
        opacity: 0.7,
    },
});

export default ResetPasswordScreen; 