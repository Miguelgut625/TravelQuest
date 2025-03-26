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
import { supabase } from '../../services/supabase';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';

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

            // Si el envío fue exitoso, navegamos a VerifyCode con el email
            navigation.navigate('VerifyCode', { email });
        } catch (error) {
            console.error('Error al enviar código de recuperación:', error);
            Alert.alert('Error', 'Ocurrió un error al enviar el código de recuperación');
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

export default ForgotPasswordScreen; 