import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Modal, Alert } from 'react-native';
import { useDispatch } from 'react-redux';
import { setUser, setToken } from '../../features/authSlice';
import { supabase } from '../../services/supabase';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

const LoginScreen = ({ navigation }: any) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isResetPasswordVisible, setIsResetPasswordVisible] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMessage, setResetMessage] = useState({ type: '', text: '' });
  const dispatch = useDispatch();

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Por favor ingresa email y contraseña');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Iniciamos sesión usando el sistema de autenticación de Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        // Verificar si el error es de credenciales inválidas
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Contraseña Incorrecta');
        }
        throw error;
      }

      if (data.user && data.session) {
        // Guardamos los datos del usuario en Redux
        dispatch(setUser({
          id: data.user.id,
          email: data.user.email!,
          username: data.user.user_metadata.username || email.split('@')[0],
        }));
        dispatch(setToken(data.session.access_token));

        // Navegamos a la pantalla principal
        navigation.replace('Main');
      }
    } catch (error: any) {
      console.error('Error de inicio de sesión:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };
  //Reset del password
  const handleResetPassword = async () => {
    if (!resetEmail) {
      setResetMessage({ type: 'error', text: 'Por favor ingresa tu correo electrónico' });
      return;
    }

    setLoading(true);
    setResetMessage({ type: '', text: '' });

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: 'travelquest://reset-password',
      });

      if (error) throw error;

      setResetMessage({
        type: 'success',
        text: 'Se ha enviado un enlace a tu correo para restablecer tu contraseña'
      });

      // Limpiar y cerrar el modal después de 3 segundos
      setTimeout(() => {
        setResetEmail('');
        setIsResetPasswordVisible(false);
        setResetMessage({ type: '', text: '' });
      }, 3000);

    } catch (error: any) {
      console.error('Error al enviar email de recuperación:', error);
      setResetMessage({
        type: 'error',
        text: error.message || 'Error al enviar el correo de recuperación'
      });
    } finally {
      setLoading(false);
    }
  };

  // Efecto para manejar el enlace de restablecimiento de contraseña
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
      if (event === 'PASSWORD_RECOVERY') {
        navigation.navigate('ResetPassword');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigation]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Iniciar Sesión</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <TextInput
        style={styles.input}
        placeholder="Contraseña"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity
        style={styles.button}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.buttonText}>Iniciar Sesión</Text>
        )}
      </TouchableOpacity>

      <View style={styles.linksContainer}>
        <TouchableOpacity onPress={() => setIsResetPasswordVisible(true)}>
          <Text style={styles.link}>¿Olvidaste tu contraseña?</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <Text style={styles.link}>¿No tienes cuenta? Regístrate</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={isResetPasswordVisible}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Recuperar Contraseña</Text>

            {resetMessage.text ? (
              <Text style={[
                styles.messageText,
                resetMessage.type === 'error' ? styles.errorMessage : styles.successMessage
              ]}>
                {resetMessage.text}
              </Text>
            ) : null}

            <TextInput
              style={styles.input}
              placeholder="Ingresa tu correo electrónico"
              value={resetEmail}
              onChangeText={(text) => {
                setResetEmail(text);
                setResetMessage({ type: '', text: '' });
              }}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setIsResetPasswordVisible(false);
                  setResetEmail('');
                  setResetMessage({ type: '', text: '' });
                }}
              >
                <Text style={styles.modalButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.sendButton,
                  loading && styles.disabledButton
                ]}
                onPress={handleResetPassword}
                disabled={loading}
              >
                <Text style={styles.modalButtonText}>
                  {loading ? 'Enviando...' : 'Enviar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 40,
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
  linksContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 20,
  },
  link: {
    color: '#2196F3',
    fontSize: 14,
    marginVertical: 5,
    textDecorationLine: 'underline',
  },
  errorText: {
    color: '#f44336',
    marginBottom: 10,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#f44336',
  },
  sendButton: {
    backgroundColor: '#4CAF50',
  },
  modalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  messageText: {
    textAlign: 'center',
    marginBottom: 15,
    padding: 10,
    borderRadius: 5,
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

export default LoginScreen; 