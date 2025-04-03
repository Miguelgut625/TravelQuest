import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { setUser, setAuthState, setError } from '../../features/authSlice';
import { supabase } from '../../services/supabase';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import styles from './style';

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
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('username')
        .eq('id', data.user.id)
        .single();

      if (userError) {
        console.error('Error obteniendo datos del usuario:', userError);
      }

      // Actualizar el estado con los datos del usuario
      dispatch(setUser({
        email: data.user.email || '',
        id: data.user.id,
        username: userData?.username
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

export default LoginScreen; 