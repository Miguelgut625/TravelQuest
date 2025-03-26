import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Image, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSelector } from 'react-redux';
import { RootState } from '../../features/store';
import { JournalEntry } from '../../features/journalSlice';
const Logo = require('../../assets/icons/logo.png');

const colors = {
  primary: '#005F9E',
  secondary: '#FFFFFF',
  danger: '#D32F2F',
  backgroundGradient: ['#005F9E', '#F0F0F0'],
};

const JournalEntryCard = ({ entry, isSmallScreen }: { entry: JournalEntry; isSmallScreen: boolean }) => {
  const dynamicStyles = getDynamicStyles(isSmallScreen);

  return (
    <TouchableOpacity style={styles.card}>
      <Text style={dynamicStyles.cardTitle}>{entry.title}</Text>
      <Text style={styles.cardDate}>{new Date(entry.createdAt).toLocaleDateString()}</Text>
      <Text style={styles.cardContent} numberOfLines={3}>
        {entry.content}
      </Text>
      {entry.photos.length > 0 && (
        <View style={styles.photoGrid}>
          {entry.photos.slice(0, 3).map((photo, index) => (
            <Image
              key={index}
              source={{ uri: photo }}
              style={dynamicStyles.thumbnail}
              resizeMode="cover"
            />
          ))}
          {entry.photos.length > 3 && (
            <View style={dynamicStyles.morePhotos}>
              <Text style={dynamicStyles.morePhotosText}>+{entry.photos.length - 3}</Text>
            </View>
          )}
        </View>
      )}
      <View style={styles.tags}>
        {entry.tags.map((tag, index) => (
          <Text key={index} style={styles.tag}>
            #{tag}
          </Text>
        ))}
      </View>
    </TouchableOpacity>
  );
};

const JournalScreen = () => {
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 400;

  const dynamicStyles = getDynamicStyles(isSmallScreen);

  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const entries = useSelector((state: RootState) => state.journal.entries);
  const cities = Object.keys(entries);

  const renderCityEntries = () => {
    if (!selectedCity) return null;
    return (
      <FlatList
        data={entries[selectedCity]}
        renderItem={({ item }) => <JournalEntryCard entry={item} isSmallScreen={isSmallScreen} />}
        keyExtractor={(item) => item.id}
        style={styles.entriesList}
      />
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={colors.backgroundGradient} style={styles.headerGradient}>
        <View style={styles.logoContainer}>
          <Image source={Logo} style={dynamicStyles.logo} />
        </View>
        <Text style={dynamicStyles.title}>Diario de Viaje</Text>
      </LinearGradient>
      <View style={styles.cityTabs}>
        <FlatList
          horizontal
          data={cities}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.cityTab, selectedCity === item && styles.selectedCityTab]}
              onPress={() => setSelectedCity(item)}
            >
              <Text style={[styles.cityTabText, selectedCity === item && styles.selectedCityTabText]}>
                {item}
              </Text>
            </TouchableOpacity>
          )}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
        />
      </View>
      {renderCityEntries()}
    </View>
  );
};

const getDynamicStyles = (isSmallScreen: boolean) =>
  StyleSheet.create({
    logo: {
      width: isSmallScreen ? 60 : 100,
      height: isSmallScreen ? 60 : 100,
      resizeMode: 'contain',
    },
    title: {
      fontSize: isSmallScreen ? 20 : 24,
      fontWeight: 'bold',
      color: colors.secondary,
      textAlign: 'center',
    },
    cardTitle: {
      fontSize: isSmallScreen ? 16 : 18,
      fontWeight: 'bold',
      marginBottom: 5,
      color: colors.primary,
    },
    thumbnail: {
      width: isSmallScreen ? 60 : 80,
      height: isSmallScreen ? 60 : 80,
      borderRadius: 5,
      marginRight: 5,
    },
    morePhotos: {
      width: isSmallScreen ? 60 : 80,
      height: isSmallScreen ? 60 : 80,
      backgroundColor: 'rgba(0,0,0,0.5)',
      borderRadius: 5,
      justifyContent: 'center',
      alignItems: 'center',
    },
    morePhotosText: {
      color: colors.secondary,
      fontSize: isSmallScreen ? 14 : 16,
      fontWeight: 'bold',
    },
  });

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundGradient[1],
  },
  headerGradient: {
    padding: 60,
    paddingTop: 55,
  },
  logoContainer: {
    position: 'absolute',
    top: 20,
    left: 10,
  },
  cityTabs: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  cityTab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginRight: 10,
    backgroundColor: colors.secondary,
    borderRadius: 20,
    elevation: 3,
  },
  selectedCityTab: {
    backgroundColor: colors.primary,
  },
  cityTabText: {
    color: '#666',
    fontWeight: 'bold',
  },
  selectedCityTabText: {
    color: colors.secondary,
  },
  entriesList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: colors.secondary,
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    elevation: 5,
  },
  cardDate: {
    color: '#666',
    fontSize: 12,
    marginBottom: 10,
  },
  cardContent: {
    color: '#333',
    marginBottom: 10,
  },
  photoGrid: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    color: colors.primary,
    marginRight: 10,
    fontSize: 12,
  },
});

export default JournalScreen;