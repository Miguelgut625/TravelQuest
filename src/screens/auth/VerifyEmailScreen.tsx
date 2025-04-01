import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { supabase } from '../../services/supabase';
import { useNavigation } from '@react-navigation/native';

const VerifyEmailScreen = ({ route }: any) => {
  const { email } = route.params || {};
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation<any>();

  const resendVerificationEmail = async () => {
    if (!email) {
      Alert.alert('Error', 'No se encontró el correo electrónico');
      return;
    }

    try {
      setLoading(true);
      
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email
      });

      if (error) {
        throw error;
      }

      Alert.alert(
        'Correo enviado',
        'Se ha enviado un nuevo correo de verificación. Por favor, revisa tu bandeja de entrada.'
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo enviar el correo de verificación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verifica tu correo electrónico</Text>
      <Text style={styles.description}>
        Se ha enviado un correo de verificación a <Text style={styles.email}>{email}</Text>.
        Por favor, verifica tu correo electrónico para continuar.
      </Text>

      <Text style={styles.note}>
        Nota: Según la configuración actual de Supabase, los usuarios deben verificar su correo
        electrónico antes de poder iniciar sesión.
      </Text>

      <TouchableOpacity 
        style={styles.button}
        onPress={resendVerificationEmail}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.buttonText}>Reenviar correo de verificación</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => navigation.navigate('Login')}
      >
        <Text style={styles.backButtonText}>Volver al inicio de sesión</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
    color: '#666',
  },
  email: {
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  note: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 20,
    color: '#888',
    fontStyle: 'italic',
  },
  button: {
    width: '100%',
    height: 50,
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    marginTop: 10,
  },
  backButtonText: {
    color: '#4CAF50',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});

export default VerifyEmailScreen; 