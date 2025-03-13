import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../../features/store';
import { JournalEntry } from '../../features/journalSlice';

const JournalEntryCard = ({ entry }: { entry: JournalEntry }) => (
  <TouchableOpacity style={styles.card}>
    <Text style={styles.cardTitle}>{entry.title}</Text>
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
            style={styles.thumbnail}
            resizeMode="cover"
          />
        ))}
        {entry.photos.length > 3 && (
          <View style={styles.morePhotos}>
            <Text style={styles.morePhotosText}>+{entry.photos.length - 3}</Text>
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

const JournalScreen = () => {
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const entries = useSelector((state: RootState) => state.journal.entries);
  const cities = Object.keys(entries);

  const renderCityEntries = () => {
    if (!selectedCity) return null;
    return (
      <FlatList
        data={entries[selectedCity]}
        renderItem={({ item }) => <JournalEntryCard entry={item} />}
        keyExtractor={(item) => item.id}
        style={styles.entriesList}
      />
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Diario de Viaje</Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  cityTabs: {
    marginBottom: 20,
  },
  cityTab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginRight: 10,
    backgroundColor: 'white',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  selectedCityTab: {
    backgroundColor: '#4CAF50',
  },
  cityTabText: {
    color: '#666',
    fontWeight: 'bold',
  },
  selectedCityTabText: {
    color: 'white',
  },
  entriesList: {
    flex: 1,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
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
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 5,
    marginRight: 5,
  },
  morePhotos: {
    width: 80,
    height: 80,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  morePhotosText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    color: '#4CAF50',
    marginRight: 10,
    fontSize: 12,
  },
});

export default JournalScreen; 