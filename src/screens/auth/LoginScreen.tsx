import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Modal, Alert } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { setUser, setToken, setAuthState } from '../../features/authSlice';
import { supabase } from '../../services/supabase';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type RootStackParamList = {
  Main: undefined;
  Login: undefined;
  Register: undefined;
  EmailSent: undefined;
  ResetPassword: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetPasswordVisible, setIsResetPasswordVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dispatch = useDispatch();
  const navigation = useNavigation<NavigationProp>();

  useEffect(() => {
    console.log('LoginScreen montado');
    // Verificar el estado inicial de autenticación
    supabase.auth.getSession().then(({ data }) => {
      const session = data?.session;
      console.log('Estado de sesión:', session ? 'Activa' : 'Inactiva');
      if (session) {
        // Si hay una sesión activa, redirigir a Main
        navigation.replace('Main');
      }
    });
  }, [navigation]);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Por favor ingresa email y contraseña');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('Intentando iniciar sesión...');
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('Error de autenticación:', error);
        if (error.message.includes('Invalid login credentials')) {
          setError('Contraseña Incorrecta');
        } else {
          setError(error.message);
        }
        return;
      }

      if (data.user && data.session) {
        console.log('Inicio de sesión exitoso');
        dispatch(setUser({
          id: data.user.id,
          email: data.user.email!,
          username: data.user.user_metadata.username || email.split('@')[0],
        }));
        dispatch(setToken(data.session.access_token));
        dispatch(setAuthState('authenticated'));
        navigation.replace('Main');
      }
    } catch (error: any) {
      console.error('Error de inicio de sesión:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetEmail) {
      Alert.alert('Error', 'Por favor ingresa tu correo electrónico.');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: 'travelquest://reset-password',
      });

      if (error) throw error;

      setIsResetPasswordVisible(false);
      navigation.replace('EmailSent');

    } catch (error: any) {
      console.error('Error al enviar el enlace de recuperación:', error);
      Alert.alert('Error', error.message || 'Error al enviar el enlace de recuperación.');
    } finally {
      setLoading(false);
    }
  };

  // Efecto para manejar el enlace de restablecimiento de contraseña
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
      console.log('Evento de autenticación:', event);
      if (event === 'PASSWORD_RECOVERY') {
        console.log('Estado de recuperación de contraseña detectado');
        dispatch(setAuthState('password_recovery'));
        navigation.reset({
          index: 0,
          routes: [{ name: 'ResetPassword' }],
        });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [dispatch, navigation]);

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Text style={styles.title}>TravelQuest</Text>
      </View>

      <View style={styles.formContainer}>
        <TextInput
          style={styles.input}
          placeholder="Correo electrónico"
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

        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}

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

        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <Text style={styles.link}>¿No tienes cuenta? Regístrate</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setIsResetPasswordVisible(true)}>
          <Text style={styles.link}>¿Olvidaste tu contraseña?</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={isResetPasswordVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsResetPasswordVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Recuperar Contraseña</Text>
            <TextInput
              style={styles.input}
              placeholder="Correo electrónico"
              value={resetEmail}
              onChangeText={setResetEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TouchableOpacity
              style={styles.button}
              onPress={handleResetPassword}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.buttonText}>Enviar Enlace</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setIsResetPasswordVisible(false)}>
              <Text style={styles.link}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
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
  link: {
    color: '#4CAF50',
    fontSize: 14,
    marginTop: 20,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  errorText: {
    color: '#f44336',
    marginBottom: 10,
    textAlign: 'center',
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
    color: '#4CAF50',
  },
});

export default LoginScreen; 