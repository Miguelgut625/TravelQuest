import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useDispatch } from 'react-redux';
import { setUser, setToken } from '../../features/authSlice';
import axios from 'axios';

// URL base de la API
const API_URL = 'http://192.168.56.1:5000/api';

const RegisterScreen = ({ navigation }: any) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const dispatch = useDispatch();

  const handleRegister = async () => {
    if (!email || !password || !username) {
      setError('Todos los campos son obligatorios');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Llamada a la API para registrar el usuario
      const response = await axios.post(`${API_URL}/users`, {
        email,
        password,
        username
      });

      // Guardar el usuario en Redux
      dispatch(setUser({
        id: response.data.user.id,
        email: response.data.user.email,
        username: response.data.user.username,
      }));

      // Mostrar mensaje de éxito
      Alert.alert(
        'Registro exitoso',
        'Tu cuenta ha sido creada. Por favor, verifica tu correo electrónico para activarla.',
        [
          { 
            text: 'OK', 
            onPress: () => navigation.replace('VerifyEmail', { email }) 
          }
        ]
      );
    } catch (error) {
      console.error('Error al registrar usuario:', error);
      
      if (error.response) {
        // Error de respuesta del servidor
        setError(error.response.data.error || 'Error al crear la cuenta');
      } else if (error.request) {
        // Error de red o servidor no disponible
        setError('No se pudo conectar con el servidor. Verifica tu conexión a internet.');
      } else {
        // Error inesperado
        setError('Error inesperado al crear la cuenta');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Crear Cuenta</Text>
      <TextInput
        style={styles.input}
        placeholder="Nombre de usuario"
        value={username}
        onChangeText={setUsername}
      />
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
      <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.buttonText}>Registrarse</Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={styles.link}>¿Ya tienes cuenta? Inicia sesión</Text>
      </TouchableOpacity>
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
    backgroundColor: '#005F9E',
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
    marginTop: 20,
    color: '#005F9E',
    textDecorationLine: 'underline',
  },
  errorText: {
    color: 'red',
    marginTop: 10,
  },
});

export default RegisterScreen; 