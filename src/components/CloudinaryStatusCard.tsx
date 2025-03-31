import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getCloudinaryConfigInfo } from '../services/cloudinaryService';
import CloudinaryConfigGuide from './CloudinaryConfigGuide';

const CloudinaryStatusCard = () => {
  const [showConfigGuide, setShowConfigGuide] = useState(false);
  const configInfo = getCloudinaryConfigInfo();
  
  const getStatusColor = () => {
    if (configInfo.isConfigured) return '#4CAF50'; // Verde
    if (__DEV__ && configInfo.usingFallback) return '#FFA000'; // Naranja para dev
    return '#f44336'; // Rojo para producción sin configurar
  };

  const getStatusText = () => {
    if (configInfo.isConfigured) return 'Configurado correctamente';
    if (__DEV__ && configInfo.usingFallback) return 'Usando fallback (solo desarrollo)';
    return 'No configurado';
  };

  const handleConfigurePress = () => {
    if (configInfo.isConfigured) {
      Alert.alert(
        "Cloudinary ya está configurado",
        "¿Qué deseas hacer?",
        [
          {
            text: "Ver configuración",
            onPress: () => setShowConfigGuide(true)
          },
          {
            text: "Cancelar",
            style: "cancel"
          }
        ]
      );
    } else {
      setShowConfigGuide(true);
    }
  };

  return (
    <>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Ionicons name="cloud-upload" size={24} color="#005F9E" />
            <Text style={styles.title}>Cloudinary</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
            <Text style={styles.statusText}>{getStatusText()}</Text>
          </View>
        </View>
        
        <Text style={styles.description}>
          Se utiliza para almacenar las fotos de tus misiones completadas.
          {!configInfo.isConfigured && !configInfo.usingFallback && ' Es necesario configurarlo para subir fotos.'}
          {__DEV__ && configInfo.usingFallback && ' En modo desarrollo puedes seguir probando sin configurarlo.'}
        </Text>
        
        <View style={styles.infoContainer}>
          {configInfo.isConfigured ? (
            <>
              <Text style={styles.infoText}>
                <Text style={styles.infoLabel}>Cloud Name: </Text>
                {configInfo.cloudName}
              </Text>
              <Text style={styles.infoText}>
                <Text style={styles.infoLabel}>Preset: </Text>
                {configInfo.uploadPreset}
              </Text>
            </>
          ) : (
            <Text style={styles.warningText}>
              {__DEV__ 
                ? 'En modo desarrollo puedes probar la app, pero las imágenes no se guardarán en la nube.' 
                : 'Se requiere configuración para subir imágenes.'}
            </Text>
          )}
        </View>
        
        <TouchableOpacity 
          style={[
            styles.configButton,
            configInfo.isConfigured ? styles.configuredButton : styles.unconfiguredButton
          ]}
          onPress={handleConfigurePress}
        >
          <Text style={styles.configButtonText}>
            {configInfo.isConfigured ? 'Ver configuración' : 'Configurar Cloudinary'}
          </Text>
        </TouchableOpacity>
      </View>
      
      <Modal
        visible={showConfigGuide}
        transparent={true}
        animationType="slide"
      >
        <CloudinaryConfigGuide onClose={() => setShowConfigGuide(false)} />
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    lineHeight: 20,
  },
  infoContainer: {
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
  },
  infoText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 5,
  },
  infoLabel: {
    fontWeight: 'bold',
  },
  warningText: {
    fontSize: 14,
    color: '#FFA000',
  },
  configButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  configuredButton: {
    backgroundColor: '#E3F2FD',
  },
  unconfiguredButton: {
    backgroundColor: '#FFA000',
  },
  configButtonText: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#005F9E',
  },
});

export default CloudinaryStatusCard; 