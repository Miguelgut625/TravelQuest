import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useDispatch } from 'react-redux';
import { setUser, setToken } from '../../features/authSlice';
import { supabase } from '../../services/supabase';
import { colors, commonStyles, typography, spacing, borderRadius } from '../../styles/theme';

const RegisterScreen = ({ navigation }: any) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const dispatch = useDispatch();

  const handleRegister = async () => {
    setLoading(true);
    setError('');

    try {
      // Crear un nuevo usuario en Supabase
      const { data: authData, error: signupError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username
          }
        }
      });

      if (signupError) throw signupError;

      if (!authData.user) {
        throw new Error('No se pudo crear el usuario');
      }

      // Insertar el usuario en la tabla 'users' con la contraseña
      const { error: insertError } = await supabase
        .from('users')
        .insert([
          {
            id: authData.user.id,
            email,
            username,
            password,
            created_at: new Date().toISOString()
          }
        ]);

      if (insertError) throw insertError;

      // Guardar el usuario en Redux
      dispatch(setUser({
        id: authData.user.id,
        email: authData.user.email!,
        username: username,
      }));

      // Redirigir a la pantalla de verificación de email
      navigation.replace('VerifyEmail', { email });
    } catch (error: any) {
      setError(error.message);
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
    ...commonStyles.container,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  title: {
    ...typography.h1,
    marginBottom: spacing.xl,
    color: colors.text.primary,
  },
  input: {
    ...commonStyles.input,
  },
  button: {
    ...commonStyles.button,
    marginTop: spacing.sm,
  },
  buttonText: {
    ...commonStyles.buttonText,
  },
  link: {
    marginTop: spacing.lg,
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  errorText: {
    color: colors.error,
    marginTop: spacing.sm,
  },
});

export default RegisterScreen; 