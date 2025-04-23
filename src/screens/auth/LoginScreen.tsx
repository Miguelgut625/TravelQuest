// @ts-nocheck - Ignorar todos los errores de TypeScript en este archivo
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { setUser, setAuthState, setError } from '../../features/authSlice';
import { supabase } from '../../services/supabase';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const navigation = useNavigation<NavigationProp>();
  const error = useSelector((state: any) => state.auth.error);

  const handleLogin = async () => {
    if (!email || !password) {
      dispatch(setError('Por favor ingresa email y contraseña'));
      return;
    }

    try {
      setLoading(true);
      dispatch(setAuthState('loading'));
      dispatch(setError(null));

      console.log('Iniciando sesión para:', email);

      // Intentar iniciar sesión directamente
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim()
      });

      if (error) {
        console.error('Error de autenticación:', error);
        if (error.message.includes('Invalid login credentials')) {
          dispatch(setError('Email o contraseña incorrectos.'));
        } else if (error.message.includes('User not allowed') || error.message.includes('Email not confirmed')) {
          dispatch(setError('Necesitas verificar tu correo electrónico antes de iniciar sesión'));
          // Redirigir a la pantalla de verificación
          navigation.navigate('VerifyEmail', { email: email.trim() });
          return;
        } else {
          dispatch(setError('Error al iniciar sesión: ' + error.message));
        }
        dispatch(setAuthState('unauthenticated'));
        return;
      }

      if (!data.user) {
        dispatch(setError('No se encontró el usuario'));
        dispatch(setAuthState('unauthenticated'));
        return;
      }

      console.log('Login exitoso:', data.user.email);

      // Obtener datos adicionales del usuario
      console.log('Obteniendo datos del usuario con ID:', data.user.id);

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('username')
        .eq('id', data.user.id)
        .single();

      if (userError) {
        console.error('Error obteniendo datos del usuario:', userError);
      }

      console.log('Datos del usuario obtenidos de la tabla users:', userData);
      console.log('Username específico:', userData?.username);

      // Actualizar el estado con los datos del usuario
      dispatch(setUser({
        email: data.user.email || '',
        id: data.user.id,
        username: userData?.username || 'Usuario'
      }));
      dispatch(setAuthState('authenticated'));
      navigation.navigate('Main');

    } catch (error) {
      console.error('Error inesperado durante el login:', error);
      dispatch(setError('Ocurrió un error inesperado'));
      dispatch(setAuthState('unauthenticated'));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    navigation.navigate('ForgotPassword');
  };

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

        <TouchableOpacity
          style={styles.forgotPasswordButton}
          onPress={handleForgotPassword}
          disabled={loading}
        >
          <Text style={styles.forgotPasswordText}>¿Olvidaste tu contraseña?</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <Text style={styles.link}>¿No tienes cuenta? Regístrate</Text>
        </TouchableOpacity>
      </View>
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
    color: '#005F9E',
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
    backgroundColor: '#005F9E',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  forgotPasswordButton: {
    marginTop: 15,
    alignItems: 'center',
  },
  forgotPasswordText: {
    color: '#005F9E',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  link: {
    marginTop: 20,
    color: '#005F9E',
    textAlign: 'center'
  },
  errorText: {
    color: '#f44336',
    marginBottom: 10,
    textAlign: 'center',
  },
});

export default LoginScreen; 