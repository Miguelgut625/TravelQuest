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
import { colors, commonStyles, typography, spacing, borderRadius } from '../../styles/theme';

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
        ...commonStyles.container,
        padding: spacing.lg,
        justifyContent: 'center',
    },
    title: {
        ...typography.h2,
        marginBottom: spacing.sm,
        textAlign: 'center',
        color: colors.text.primary,
    },
    subtitle: {
        ...typography.body,
        color: colors.text.secondary,
        marginBottom: spacing.lg,
        textAlign: 'center',
    },
    input: {
        ...commonStyles.input,
    },
    button: {
        ...commonStyles.button,
        marginTop: spacing.sm,
    },
    buttonDisabled: {
        backgroundColor: colors.text.secondary,
    },
    buttonText: {
        ...commonStyles.buttonText,
    },
    cancelButton: {
        marginTop: spacing.lg,
        alignItems: 'center',
    },
    cancelButtonText: {
        color: colors.text.secondary,
        ...typography.body,
    },
});

export default ForgotPasswordScreen; 