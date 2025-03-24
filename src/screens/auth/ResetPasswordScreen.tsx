import React, { useState, useEffect } from 'react';
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
import { useDispatch } from 'react-redux';
import { setUser, setToken, setAuthState } from '../../features/authSlice';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useRoute } from '@react-navigation/native';
import { Linking } from 'react-native';

// Definir el tipo para la navegación
type RootStackParamList = {
  ResetPassword: undefined;
  Login: undefined;
  Main: undefined;
};

type ResetPasswordScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ResetPassword'>;

export const ResetPasswordScreen = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSessionValid, setIsSessionValid] = useState(false);
  const dispatch = useDispatch();
  const navigation = useNavigation<ResetPasswordScreenNavigationProp>();

  useEffect(() => {
    const checkSession = async () => {
      try {
        console.log('Verificando sesión en ResetPasswordScreen...');

        const url = await Linking.getInitialURL();
        console.log('URL actual:', url);

        if (url?.includes('type=recovery')) {
          console.log('Enlace de recuperación detectado');

          // Extraer tokens
          const accessToken = url.split('access_token=')[1]?.split('&')[0];
          const refreshToken = url.split('refresh_token=')[1]?.split('&')[0];

          if (!accessToken) {
            throw new Error('Token de acceso no encontrado en la URL');
          }

          // Intentar establecer la sesión directamente
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });

          if (error) {
            throw new Error(`Error al establecer la sesión: ${error.message}`);
          }

          if (data.session) {
            console.log('Sesión establecida correctamente');
            setIsSessionValid(true);

            // Importante: Mantener el estado en password_recovery
            dispatch(setAuthState('password_recovery'));

            // No establecer el usuario completo aquí, solo lo necesario
            dispatch(setToken(data.session.access_token));
          } else {
            throw new Error('No se pudo obtener la sesión después de establecerla');
          }
        } else {
          throw new Error('No se encontró un enlace de recuperación válido');
        }
      } catch (error) {
        console.error('Error en checkSession:', error);
        Alert.alert(
          'Error',
          error instanceof Error ? error.message : 'Error al verificar la sesión',
          [{ text: 'OK', onPress: () => navigation.replace('Login') }]
        );
      }
    };

    checkSession();
  }, []);

  const handleResetPassword = async () => {
    if (!isSessionValid) {
      Alert.alert('Error', 'No hay una sesión válida para actualizar la contraseña');
      return;
    }

    if (!newPassword || !confirmPassword) {
      Alert.alert('Error', 'Por favor, completa todos los campos');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      // Obtener la sesión actual
      const { data: { session } } = await supabase.auth.getSession();

      if (session && data.user) {
        // Establecer el usuario y el token
        dispatch(setUser({
          id: data.user.id,
          email: data.user.email!,
          username: data.user.user_metadata.username || data.user.email!.split('@')[0],
        }));
        dispatch(setToken(session.access_token));
        dispatch(setAuthState('authenticated'));

        Alert.alert(
          'Éxito',
          'Contraseña actualizada correctamente',
          [
            {
              text: 'OK',
              onPress: () => {
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Main' }],
                });
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error al actualizar contraseña:', error);
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Error al actualizar la contraseña'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    dispatch(setAuthState('unauthenticated'));
    navigation.replace('Login');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Recuperar Contraseña</Text>
      <Text style={styles.subtitle}>
        Por favor, ingresa tu nueva contraseña
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Nueva contraseña"
        value={newPassword}
        onChangeText={setNewPassword}
        secureTextEntry
        autoCapitalize="none"
      />

      <TextInput
        style={styles.input}
        placeholder="Confirmar contraseña"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        autoCapitalize="none"
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleResetPassword}
        disabled={loading || !isSessionValid}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.buttonText}>Actualizar Contraseña</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.cancelButton}
        onPress={handleCancel}
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