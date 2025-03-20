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
import { RootStackParamList } from '../../navigation/types';
import { useRoute } from '@react-navigation/native';
import { Linking } from 'react-native';

type ResetPasswordScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ResetPassword'>;

export const ResetPasswordScreen = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const navigation = useNavigation<ResetPasswordScreenNavigationProp>();
  const route = useRoute();

  useEffect(() => {
    const checkSession = async () => {
      console.log('Verificando sesión en ResetPasswordScreen...');
      
      // Obtener la URL actual
      const url = await Linking.getInitialURL();
      console.log('URL actual:', url);

      if (url?.includes('type=recovery')) {
        console.log('Enlace de recuperación detectado');
        return; // Permitir continuar con el proceso de recuperación
      }

      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error al verificar sesión:', error);
        Alert.alert('Error', 'No se pudo verificar la sesión');
        return;
      }

      if (!session) {
        console.log('No hay sesión activa ni enlace de recuperación');
        Alert.alert(
          'Error',
          'No hay una sesión activa de recuperación de contraseña. Por favor, solicita un nuevo enlace.',
          [{ text: 'OK', onPress: () => navigation.replace('Login') }]
        );
      }
    };

    checkSession();
  }, []);

  const handleResetPassword = async () => {
    console.log('handleResetPassword llamado');
    console.log('Nueva contraseña:', newPassword);
    console.log('Confirmar contraseña:', confirmPassword);
    
    if (!newPassword || !confirmPassword) {
      console.log('Error: Campos vacíos');
      Alert.alert('Error', 'Por favor, completa todos los campos');
      return;
    }

    if (newPassword.length < 6) {
      console.log('Error: Contraseña demasiado corta');
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      console.log('Error: Las contraseñas no coinciden');
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    console.log('Iniciando actualización de contraseña...');

    try {
      // Primero verificar la sesión actual
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('Error al obtener sesión:', sessionError);
        Alert.alert('Error', 'No se pudo obtener la sesión actual');
        return;
      }

      if (!session) {
        console.error('No hay sesión activa');
        Alert.alert('Error', 'No hay una sesión activa. Por favor, solicita un nuevo enlace.');
        return;
      }

      console.log('Actualizando contraseña para usuario:', session.user.email);
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        console.error('Error al actualizar contraseña:', updateError);
        Alert.alert('Error', updateError.message);
        return;
      }

      console.log('Contraseña actualizada exitosamente');
      
      // Obtener la sesión actualizada
      const { data: { session: updatedSession }, error: updatedSessionError } = await supabase.auth.getSession();
      
      if (updatedSessionError) {
        console.error('Error al obtener sesión actualizada:', updatedSessionError);
        Alert.alert('Error', 'No se pudo obtener la sesión actualizada');
        return;
      }

      if (updatedSession?.user) {
        console.log('Configurando usuario en Redux...');
        dispatch(setUser({
          id: updatedSession.user.id,
          email: updatedSession.user.email!,
          username: updatedSession.user.user_metadata.username || updatedSession.user.email!.split('@')[0],
        }));
        dispatch(setToken(updatedSession.access_token));
        dispatch(setAuthState('authenticated'));
        
        Alert.alert(
          'Éxito',
          'Contraseña actualizada correctamente',
          [
            {
              text: 'OK',
              onPress: () => {
                console.log('Navegando a la pantalla principal...');
                navigation.replace('Main');
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error en handleResetPassword:', error);
      Alert.alert('Error', 'Ocurrió un error al actualizar la contraseña');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    console.log('Cancelando recuperación de contraseña...');
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
        disabled={loading}
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