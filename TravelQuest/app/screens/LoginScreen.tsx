import React, { useState } from 'react';
import { styled } from 'nativewind';
import { View as RNView, Text as RNText, TextInput as RNTextInput, TouchableOpacity as RNTouchableOpacity, Image as RNImage, ActivityIndicator } from 'react-native';
import { useDispatch } from 'react-redux';
import { setUser, setToken } from '../redux/slices/authSlice';
import { supabase } from '../services/supabase';

const View = styled(RNView);
const Text = styled(RNText);
const TextInput = styled(RNTextInput);
const TouchableOpacity = styled(RNTouchableOpacity);
const Image = styled(RNImage);

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const dispatch = useDispatch();

  const handleLogin = async () => {
    try {
      setLoading(true);
      setError('');
      
      const { user, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (user) {
        dispatch(setUser({
          id: user.id,
          email: user.email!,
          username: user.user_metadata.username || '',
        }));
        dispatch(setToken(user.access_token));
        navigation.replace('Home');
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-background p-6">
      <View className="flex-1 justify-center">
        <Image
          source={require('../../assets/logo.png')}
          className="w-32 h-32 self-center mb-8"
          resizeMode="contain"
        />
        
        <Text className="text-3xl font-bold text-center text-primary mb-8">
          TravelQuest
        </Text>

        <View className="space-y-4">
          <TextInput
            className="bg-white p-4 rounded-lg border border-gray-200"
            placeholder="Correo electrónico"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <TextInput
            className="bg-white p-4 rounded-lg border border-gray-200"
            placeholder="Contraseña"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {error ? (
            <Text className="text-red-500 text-center">{error}</Text>
          ) : null}

          <TouchableOpacity
            className="bg-primary p-4 rounded-lg"
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white text-center font-bold">
                Iniciar Sesión
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('Register')}
            className="mt-4"
          >
            <Text className="text-primary text-center">
              ¿No tienes una cuenta? Regístrate
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
} 