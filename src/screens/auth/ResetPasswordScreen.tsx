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
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import styles from './style'; // Importamos los estilos

type ResetPasswordScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const ResetPasswordScreen = () => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const navigation = useNavigation<ResetPasswordScreenNavigationProp>();

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
            // Verificar la sesión actual
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();

            if (sessionError) {
                Alert.alert('Error', 'Error al verificar la sesión');
                return;
            }

            if (!session) {
                Alert.alert('Error', 'Tu sesión ha expirado. Por favor, vuelve a iniciar sesión');
                navigation.navigate('Login');
                return;
            }

            // Actualizar la contraseña
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) {
                Alert.alert('Error', error.message);
                return;
            }

            Alert.alert('Éxito', 'Tu contraseña ha sido actualizada correctamente');
            navigation.navigate('Login');
        } catch (error) {
            console.error('Error al cambiar contraseña:', error);
            Alert.alert('Error', 'Ocurrió un error al cambiar la contraseña');
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

export default ResetPasswordScreen; 