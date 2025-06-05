import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, FlatList, ScrollView } from 'react-native';
import { TextInput as RNTextInput } from 'react-native';
import { Button, Switch } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../services/supabase';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import { format } from 'date-fns';
import { colors as defaultColors, commonStyles, typography, spacing, shadows, borderRadius, getCreateMissionStyles, missionFormCard, missionInput, missionTextInput } from '../../styles/theme';
import { useTheme } from '../../context/ThemeContext';

interface City {
  id: string;
  name: string;
}

const CreateMissionScreen = () => {
  const navigation = useNavigation();
  const { colors, isDarkMode } = useTheme();
  const styles = getCreateMissionStyles(colors, isDarkMode);
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
        <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%' }}>
          <Text style={styles.title}>Crear Nueva Misión</Text>
          <View style={{ width: 40, height: 40, marginLeft: 8 }} />
        </View>
      </View>
      <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ flexGrow: 1, alignItems: 'center', paddingVertical: spacing.xl }} keyboardShouldPersistTaps="handled">
        <View style={styles.formCard}>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Título de la misión</Text>
            <View style={[
              styles.input,
              { flexDirection: 'row', alignItems: 'center', paddingLeft: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border, borderRadius: borderRadius.medium }
            ]}>
              <RNTextInput
                value={title}
                onChangeText={setTitle}
                style={{ flex: 1, backgroundColor: 'transparent', color: colors.text.primary, fontSize: 15, paddingVertical: 4, paddingLeft: 0, borderWidth: 0 }}
                placeholder="Escribe el título"
                placeholderTextColor={colors.text.secondary}
              />
            </View>
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Descripción</Text>
            <View style={[
              styles.input,
              { flexDirection: 'row', alignItems: 'center', paddingLeft: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border, borderRadius: borderRadius.medium }
            ]}>
              <RNTextInput
                value={description}
                onChangeText={setDescription}
                style={{ flex: 1, backgroundColor: 'transparent', color: colors.text.primary, fontSize: 15, paddingVertical: 4, paddingLeft: 0, borderWidth: 0 }}
                multiline
                numberOfLines={4}
                placeholder="Describe la misión"
                placeholderTextColor={colors.text.secondary}
              />
            </View>
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Ciudad</Text>
            <View style={[styles.input, { flexDirection: 'row', alignItems: 'center', paddingLeft: spacing.md, paddingVertical: spacing.sm }]}>
              <Ionicons name="location-outline" size={20} color={isDarkMode ? colors.accent : colors.primary} style={{ marginRight: spacing.sm }} />
              <RNTextInput
                value={city}
                onChangeText={handleCitySearch}
                style={{ flex: 1, backgroundColor: 'transparent', color: colors.text.primary, fontSize: 15, paddingVertical: 4, paddingLeft: 0 }}
                autoCorrect={false}
                autoCapitalize="words"
                placeholder="¿En qué ciudad?"
                placeholderTextColor={colors.text.secondary}
                onFocus={() => city.length > 2 && filteredCities.length > 0 && setShowSuggestions(true)}
              />
            </View>
            {showSuggestions && filteredCities.length > 0 && (
              <View style={[styles.suggestionsDropdown, { backgroundColor: isDarkMode ? colors.surface : '#FFF' }]}>
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
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Dificultad</Text>
            <View style={styles.difficultyButtons}>
              {['fácil', 'media', 'difícil'].map((level) => {
                const isActive = difficulty === level;
                return (
                  <Button
                    key={level}
                    mode="contained"
                    onPress={() => setDifficulty(level)}
                    style={[styles.difficultyButton, isActive && styles.difficultyButtonActive]}
                    labelStyle={isActive ? styles.difficultyButtonTextActive : styles.difficultyButtonText}
                    contentStyle={{ height: 40 }}
                  >
                    {level}
                  </Button>
                );
              })}
            </View>
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Puntos</Text>
            <View style={[
              styles.input,
              { flexDirection: 'row', alignItems: 'center', paddingLeft: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border, borderRadius: borderRadius.medium }
            ]}>
              <RNTextInput
                value={points}
                onChangeText={setPoints}
                style={{ flex: 1, backgroundColor: 'transparent', color: colors.text.primary, fontSize: 15, paddingVertical: 4, paddingLeft: 0, borderWidth: 0 }}
                keyboardType="numeric"
                placeholder="¿Cuántos puntos?"
                placeholderTextColor={colors.text.secondary}
              />
            </View>
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Rango de fechas</Text>
            <TouchableOpacity
              style={[styles.dateCard, { backgroundColor: isDarkMode ? colors.surface : '#F5F7FA' }]}
              onPress={() => setShowCalendar(true)}
            >
              <Ionicons name="calendar" size={22} color={isDarkMode ? colors.accent : colors.primary} />
              <View>
                <Text style={styles.dateCardText}>Seleccionar rango de fechas para la misión</Text>
                <Text style={styles.dateCardSub}>
                  {startDate && endDate
                    ? `Del ${formatDate(startDate)} al ${formatDate(endDate)}`
                    : 'No seleccionado'}
                </Text>
              </View>
            </TouchableOpacity>
            {showCalendar && (
              <ScrollView style={{ maxHeight: 400 }}>
                <Calendar
                  markingType={'period'}
                  theme={{
                    backgroundColor: isDarkMode ? '#101828' : '#fff',
                    calendarBackground: isDarkMode ? '#101828' : '#fff',
                    textSectionTitleColor: isDarkMode ? colors.accent : colors.primary,
                    selectedDayBackgroundColor: colors.accent,
                    selectedDayTextColor: '#181C22',
                    todayTextColor: isDarkMode ? colors.accent : colors.primary,
                    dayTextColor: isDarkMode ? '#fff' : colors.text.primary,
                    textDisabledColor: isDarkMode ? '#334155' : '#d9e1e8',
                    monthTextColor: isDarkMode ? colors.accent : colors.primary,
                    arrowColor: isDarkMode ? colors.accent : colors.primary,
                    dotColor: colors.accent,
                    indicatorColor: colors.accent,
                    textDayFontFamily: 'System',
                    textMonthFontFamily: 'System',
                    textDayHeaderFontFamily: 'System',
                  }}
                  markedDates={(() => {
                    if (!startDate) return {};
                    const marked: any = {};
                    const startStr = startDate.toISOString().split('T')[0];
                    marked[startStr] = { startingDay: true, color: colors.accent, textColor: '#181C22' };
                    if (endDate) {
                      let current = new Date(startDate);
                      while (current < endDate) {
                        current.setDate(current.getDate() + 1);
                        const dStr = current.toISOString().split('T')[0];
                        if (dStr !== endDate.toISOString().split('T')[0]) {
                          marked[dStr] = { color: isDarkMode ? '#232B3A' : '#e6f2ff', textColor: isDarkMode ? '#fff' : colors.primary };
                        }
                      }
                      const endStr = endDate.toISOString().split('T')[0];
                      marked[endStr] = { endingDay: true, color: colors.accent, textColor: '#181C22' };
                    }
                    return marked;
                  })()}
                  onDayPress={handleDayPress}
                  minDate={new Date().toISOString().split('T')[0]}
                />
                <Button
                  mode="outlined"
                  style={{
                    marginTop: spacing.md,
                    alignSelf: 'center',
                    borderColor: isDarkMode ? colors.accent : colors.primary,
                    backgroundColor: isDarkMode ? colors.accent : 'transparent',
                    borderWidth: 1,
                    borderRadius: 24,
                    paddingHorizontal: 24,
                  }}
                  labelStyle={{
                    color: isDarkMode ? '#181C22' : colors.primary,
                    fontWeight: 'bold',
                  }}
                  onPress={() => {
                    setStartDate(null);
                    setEndDate(null);
                    setShowCalendar(false);
                  }}
                  disabled={false}
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
            labelStyle={styles.submitButtonText}
          >
            Crear Misión
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default CreateMissionScreen; 