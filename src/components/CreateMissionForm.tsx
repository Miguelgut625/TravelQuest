import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import { supabase } from '../services/supabase';
import { useTheme } from 'react-native-paper';

interface CreateMissionFormProps {
  onMissionCreated: () => void;
}

const CreateMissionForm: React.FC<CreateMissionFormProps> = ({ onMissionCreated }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [points, setPoints] = useState('');
  const [loading, setLoading] = useState(false);
  const theme = useTheme();

  const handleSubmit = async () => {
    if (!title || !description || !city || !points) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('challenges')
        .insert({
          title,
          description,
          city,
          difficulty,
          points: parseInt(points),
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      Alert.alert('Éxito', 'Misión creada correctamente');
      onMissionCreated();
      // Limpiar el formulario
      setTitle('');
      setDescription('');
      setCity('');
      setDifficulty('medium');
      setPoints('');
    } catch (error) {
      console.error('Error al crear la misión:', error);
      Alert.alert('Error', 'No se pudo crear la misión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Crear Nueva Misión</Text>
      
      <TextInput
        label="Título"
        value={title}
        onChangeText={setTitle}
        style={styles.input}
        mode="outlined"
      />

      <TextInput
        label="Descripción"
        value={description}
        onChangeText={setDescription}
        style={styles.input}
        mode="outlined"
        multiline
        numberOfLines={4}
      />

      <TextInput
        label="Ciudad"
        value={city}
        onChangeText={setCity}
        style={styles.input}
        mode="outlined"
      />

      <View style={styles.difficultyContainer}>
        <Text style={styles.label}>Dificultad:</Text>
        <View style={styles.difficultyButtons}>
          {(['easy', 'medium', 'hard'] as const).map((level) => (
            <Button
              key={level}
              mode={difficulty === level ? 'contained' : 'outlined'}
              onPress={() => setDifficulty(level)}
              style={styles.difficultyButton}
            >
              {level.charAt(0).toUpperCase() + level.slice(1)}
            </Button>
          ))}
        </View>
      </View>

      <TextInput
        label="Puntos"
        value={points}
        onChangeText={setPoints}
        style={styles.input}
        mode="outlined"
        keyboardType="numeric"
      />

      <Button
        mode="contained"
        onPress={handleSubmit}
        loading={loading}
        disabled={loading}
        style={styles.submitButton}
      >
        Crear Misión
      </Button>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    marginBottom: 16,
  },
  difficultyContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
  },
  difficultyButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  difficultyButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  submitButton: {
    marginTop: 16,
  },
});

export default CreateMissionForm; 