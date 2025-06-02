import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, FlatList, ScrollView } from 'react-native';
import { TextInput, Button, Switch } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../services/supabase';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import { format } from 'date-fns';
import { colors, commonStyles, typography, spacing, shadows, borderRadius } from '../../styles/theme';

interface City {
  id: string;
  name: string;
}

const CreateMissionScreen = () => {
  const navigation = useNavigation();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [difficulty, setDifficulty] = useState('fácil');
  const [points, setPoints] = useState('');
  const [loading, setLoading] = useState(false);
  const [filteredCities, setFilteredCities] = useState<City[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);

  const handleCitySearch = async (text: string) => {
    setCity(text);
    setSelectedCity(null); // Limpiar selección si el usuario escribe
    console.log('[CreateMission] Buscando ciudades para:', text);
    if (text.length > 2) {
      try {
        const { data, error } = await supabase
          .from('cities')
          .select('id, name')
          .ilike('name', `%${text}%`)
          .limit(5);
        if (error) throw error;
        setFilteredCities(data || []);
        setShowSuggestions(true);
        console.log('[CreateMission] Sugerencias encontradas:', data);
      } catch (error) {
        setFilteredCities([]);
        setShowSuggestions(false);
        console.error('[CreateMission] Error buscando ciudades:', error);
      }
    } else {
      setFilteredCities([]);
      setShowSuggestions(false);
    }
  };

  const handleCitySelect = (cityObj: City) => {
    setCity(cityObj.name);
    setSelectedCity(cityObj);
    setShowSuggestions(false);
    console.log('[CreateMission] Ciudad seleccionada:', cityObj);
  };

  const handleDayPress = (day: any) => {
    const date = new Date(day.dateString);
    if (!startDate || (startDate && endDate)) {
      setStartDate(date);
      setEndDate(null);
    } else {
      if (date < startDate) {
        setEndDate(startDate);
        setStartDate(date);
      } else {
        setEndDate(date);
      }
      setShowCalendar(false);
    }
  };

  const formatDate = (date: Date | null) => date ? format(date, 'dd/MM/yyyy') : 'No seleccionada';

  const handleSubmit = async () => {
    console.log('[CreateMission] Intentando crear misión con:', {
      title,
      description,
      city,
      selectedCity,
      difficulty,
      points,
    });
    if (!title || !description || !city || !points) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }
    if (!selectedCity) {
      Alert.alert('Error', 'Debes seleccionar una ciudad válida de la lista de sugerencias.');
      return;
    }
    if (!startDate || !endDate) {
      Alert.alert('Error', 'Selecciona el rango de fechas para la misión.');
      return;
    }
    // Calcular duración en días (inclusivo)
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const duration = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    setLoading(true);
    try {
      const { error: missionError } = await supabase
        .from('challenges')
        .insert({
          title,
          description,
          cityId: selectedCity.id,
          difficulty,
          points: parseInt(points),
          is_event: true,
          duration: duration,
          start_date: startDate ? startDate.toISOString() : null,
          end_date: endDate ? endDate.toISOString() : null,
        });
      if (missionError) throw missionError;
      console.log('[CreateMission] Misión creada correctamente');
      Alert.alert('Éxito', 'Misión creada correctamente');
      navigation.goBack();
    } catch (error) {
      console.error('[CreateMission] Error al crear misión:', error);
      Alert.alert('Error', 'No se pudo crear la misión. Por favor, intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.white} />
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Crear Nueva Misión</Text>
      </View>
      <View style={styles.formContainer}>
        <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
          <TextInput
            label="Título de la misión"
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
          <View style={{ position: 'relative' }}>
            <TextInput
              label="Ciudad"
              value={city}
              onChangeText={handleCitySearch}
              style={styles.input}
              mode="outlined"
              left={<TextInput.Icon icon="map-marker" color={colors.primary} />}
              autoCorrect={false}
              autoCapitalize="words"
              onFocus={() => city.length > 2 && filteredCities.length > 0 && setShowSuggestions(true)}
            />
            {showSuggestions && filteredCities.length > 0 && (
              <View style={styles.suggestionsDropdown}>
                <FlatList
                  data={filteredCities}
                  keyExtractor={item => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.suggestionItem}
                      onPress={() => handleCitySelect(item)}
                    >
                      <Ionicons name="location" size={18} color={colors.primary} style={styles.locationIcon} />
                      <Text style={styles.suggestionText}>{item.name}</Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            )}
          </View>
          <View style={styles.difficultyContainer}>
            <Text style={styles.label}>Dificultad:</Text>
            <View style={styles.difficultyButtons}>
              {['fácil', 'media', 'difícil'].map((level) => (
                <Button
                  key={level}
                  mode={difficulty === level ? 'contained' : 'outlined'}
                  onPress={() => setDifficulty(level)}
                  style={styles.difficultyButton}
                >
                  {level}
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
          <View style={{ marginBottom: 16 }}>
            <TouchableOpacity
              style={{
                backgroundColor: colors.white,
                borderRadius: borderRadius.medium,
                borderWidth: 1,
                borderColor: colors.border,
                padding: spacing.md,
                marginBottom: spacing.sm,
              }}
              onPress={() => setShowCalendar(true)}
            >
              <Text style={{ color: colors.text.primary, fontWeight: 'bold' }}>
                Seleccionar rango de fechas para la misión
              </Text>
              <Text style={{ color: colors.text.primary, marginTop: spacing.sm }}>
                {startDate && endDate
                  ? `Del ${formatDate(startDate)} al ${formatDate(endDate)}`
                  : 'No seleccionado'}
              </Text>
            </TouchableOpacity>
            {showCalendar && (
              <ScrollView style={{ maxHeight: 400 }}>
                <Calendar
                  markingType={'period'}
                  markedDates={(() => {
                    if (!startDate) return {};
                    const marked: any = {};
                    const startStr = startDate.toISOString().split('T')[0];
                    marked[startStr] = { startingDay: true, color: colors.primary, textColor: 'white' };
                    if (endDate) {
                      let current = new Date(startDate);
                      while (current < endDate) {
                        current.setDate(current.getDate() + 1);
                        const dStr = current.toISOString().split('T')[0];
                        if (dStr !== endDate.toISOString().split('T')[0]) {
                          marked[dStr] = { color: '#e6f2ff', textColor: colors.primary };
                        }
                      }
                      const endStr = endDate.toISOString().split('T')[0];
                      marked[endStr] = { endingDay: true, color: colors.primary, textColor: 'white' };
                    }
                    return marked;
                  })()}
                  onDayPress={handleDayPress}
                  minDate={new Date().toISOString().split('T')[0]}
                />
                <Button
                  mode="outlined"
                  style={{ marginTop: spacing.md, alignSelf: 'center' }}
                  onPress={() => {
                    setStartDate(null);
                    setEndDate(null);
                    setShowCalendar(false);
                  }}
                >
                  Borrar selección
                </Button>
              </ScrollView>
            )}
          </View>
          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={loading}
            disabled={loading || !selectedCity}
            style={styles.submitButton}
          >
            Crear Misión
          </Button>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    ...commonStyles.container,
    backgroundColor: colors.primary,
  },
  header: {
    ...commonStyles.header,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  backButtonText: {
    color: colors.white,
    ...typography.body,
    marginLeft: spacing.sm,
  },
  title: {
    ...typography.h3,
    color: colors.white,
  },
  formContainer: {
    flex: 1,
    padding: spacing.md,
    backgroundColor: colors.background,
  },
  input: {
    ...commonStyles.input,
  },
  suggestionsDropdown: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderRadius: borderRadius.medium,
    ...shadows.medium,
    zIndex: 10,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: 180,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  suggestionText: {
    ...typography.body,
    color: colors.text.primary,
    marginLeft: spacing.sm,
  },
  locationIcon: {
    color: colors.primary,
  },
  difficultyContainer: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.body,
    marginBottom: spacing.sm,
    color: colors.text.primary,
  },
  difficultyButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  difficultyButton: {
    flex: 1,
    marginHorizontal: spacing.xs,
  },
  submitButton: {
    marginTop: spacing.md,
    backgroundColor: colors.success,
  },
});

export default CreateMissionScreen; 