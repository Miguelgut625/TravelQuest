import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { setUser, setAuthState, setError } from '../../features/authSlice';
import { supabase } from '../../services/supabase';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type RootStackParamList = {
  Main: undefined;
  Login: undefined;
  Register: undefined;
};

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
      
      console.log('Verificando credenciales para:', email);
      
      // Primero verificamos si existe el usuario en la tabla users
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email.trim())
        .eq('password', password.trim())
        .single();

      if (userError || !userData) {
        console.error('Error o usuario no encontrado:', userError);
        dispatch(setError('Email o contraseña incorrectos'));
        dispatch(setAuthState('unauthenticated'));
        return;
      }

      console.log('Usuario encontrado:', userData);
      
      // Si encontramos el usuario, lo autenticamos en el estado con su ID
      dispatch(setUser({ 
        email: userData.email,
        id: userData.id 
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
});

export default LoginScreen; 