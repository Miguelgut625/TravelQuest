import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CloudinaryConfigGuideProps {
  onClose: () => void;
}

const CloudinaryConfigGuide: React.FC<CloudinaryConfigGuideProps> = ({ onClose }) => {
  const openCloudinaryWebsite = () => {
    Linking.openURL('https://cloudinary.com/');
  };

  return (
    <View style={styles.centeredView}>
      <View style={styles.modalView}>
        <View style={styles.header}>
          <Text style={styles.title}>Guía de Configuración de Cloudinary</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView}>
          <Text style={styles.sectionTitle}>¿Qué es Cloudinary?</Text>
          <Text style={styles.paragraph}>
            Cloudinary es un servicio en la nube que permite almacenar, gestionar y transformar imágenes y vídeos. 
            En TravelQuest lo usamos para guardar las fotos de tus misiones completadas.
          </Text>

          <Text style={styles.sectionTitle}>Paso 1: Crear una cuenta</Text>
          <Text style={styles.paragraph}>
            Visita <Text style={styles.link} onPress={openCloudinaryWebsite}>cloudinary.com</Text> y regístrate para obtener una cuenta gratuita.
            El plan gratuito ofrece 25GB de almacenamiento y 25GB de ancho de banda mensual,
            más que suficiente para uso personal.
          </Text>

          <Text style={styles.sectionTitle}>Paso 2: Obtener tus credenciales</Text>
          <Text style={styles.paragraph}>
            Una vez registrado, ve al Dashboard de tu cuenta y encontrarás:
          </Text>
          <View style={styles.bulletPoints}>
            <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Cloud Name:</Text> El nombre único de tu cuenta.</Text>
            <Text style={styles.bulletPoint}>• <Text style={styles.bold}>API Key:</Text> Tu clave de acceso a la API.</Text>
            <Text style={styles.bulletPoint}>• <Text style={styles.bold}>API Secret:</Text> Tu clave secreta (mantén esto privado).</Text>
          </View>

          <Text style={styles.sectionTitle}>Paso 3: Crear un Upload Preset</Text>
          <Text style={styles.paragraph}>
            1. En el Dashboard, ve a "Settings" {'>'} "Upload" {'>'} "Upload presets".
          </Text>
          <Text style={styles.paragraph}>
            2. Haz clic en "Add upload preset".
          </Text>
          <Text style={styles.paragraph}>
            3. Configúralo como:
          </Text>
          <View style={styles.bulletPoints}>
            <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Signing Mode:</Text> Unsigned</Text>
            <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Folder:</Text> travelquest (opcional)</Text>
          </View>
          <Text style={styles.paragraph}>
            4. Guarda el preset y anota su nombre.
          </Text>

          <Text style={styles.sectionTitle}>Paso 4: Configurar la aplicación</Text>
          <Text style={styles.paragraph}>
            Edita el archivo <Text style={styles.code}>src/config/cloudinary.ts</Text> con tus datos:
          </Text>
          <View style={styles.codeBlock}>
            <Text style={styles.codeLine}>const CLOUDINARY_CONFIG = {'{'}</Text>
            <Text style={styles.codeLine}>  CLOUD_NAME: 'tu_cloud_name',</Text>
            <Text style={styles.codeLine}>  UPLOAD_PRESET: 'tu_upload_preset',</Text>
            <Text style={styles.codeLine}>  API_KEY: 'tu_api_key',      // Opcional</Text>
            <Text style={styles.codeLine}>  API_SECRET: 'tu_api_secret', // Opcional</Text>
            <Text style={styles.codeLine}>  FOLDER: 'travelquest',       // Opcional</Text>
            <Text style={styles.codeLine}>{'}'}</Text>
          </View>

          <Text style={styles.sectionTitle}>Consideraciones de Seguridad</Text>
          <Text style={styles.paragraph}>
            Al usar un upload preset sin firmar, las cargas son públicas. Esto es apropiado para una aplicación personal,
            pero en un entorno de producción real, deberías:
          </Text>
          <View style={styles.bulletPoints}>
            <Text style={styles.bulletPoint}>• Configurar una API de backend para firmar las solicitudes de carga.</Text>
            <Text style={styles.bulletPoint}>• Nunca incluir tu API Secret en el código del cliente.</Text>
            <Text style={styles.bulletPoint}>• Establecer límites de tamaño y tipo de archivo en tu preset de carga.</Text>
          </View>

          <Text style={styles.sectionTitle}>¿Necesitas ayuda?</Text>
          <Text style={styles.paragraph}>
            Si encuentras problemas, consulta la <Text style={styles.link} onPress={() => Linking.openURL('https://cloudinary.com/documentation')}>documentación oficial de Cloudinary</Text> o 
            ponte en contacto con el soporte de tu aplicación.
          </Text>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.button} onPress={openCloudinaryWebsite}>
            <Text style={styles.buttonText}>Ir a Cloudinary</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.closeBtn]} onPress={onClose}>
            <Text style={styles.closeText}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 20,
  },
  modalView: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  closeButton: {
    padding: 5,
  },
  scrollView: {
    maxHeight: '80%',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#005F9E',
    marginTop: 20,
    marginBottom: 10,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 22,
    color: '#333',
    marginBottom: 10,
  },
  bulletPoints: {
    marginLeft: 10,
    marginBottom: 15,
  },
  bulletPoint: {
    fontSize: 14,
    lineHeight: 22,
    color: '#333',
    marginBottom: 5,
  },
  bold: {
    fontWeight: 'bold',
  },
  link: {
    color: '#005F9E',
    textDecorationLine: 'underline',
  },
  code: {
    fontFamily: 'monospace',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 5,
  },
  codeBlock: {
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
  },
  codeLine: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#333',
    marginBottom: 2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  button: {
    flex: 1,
    backgroundColor: '#005F9E',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  closeBtn: {
    backgroundColor: '#f5f5f5',
  },
  closeText: {
    color: '#333',
    fontWeight: 'bold',
  },
});

export default CloudinaryConfigGuide; 