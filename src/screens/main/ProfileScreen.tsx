import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, TextInput, Modal, Alert } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../features/store';
import { logout } from '../../features/authSlice';
import { supabase } from '../../services/supabase';
import { useNavigation } from '@react-navigation/native';

const ProfileScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const { completedMissions } = useSelector((state: RootState) => state.missions);
  const entries = useSelector((state: RootState) => state.journal.entries);
  const [isChangePasswordVisible, setIsChangePasswordVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const totalPoints = completedMissions.reduce((sum, mission) => sum + mission.points, 0);
  const totalCities = Object.keys(entries).length;
  const totalEntries = Object.values(entries).flat().length;

  const handleLogout = () => {
    dispatch(logout());
  };

  const handleChangePassword = async () => {
    if (!currentPassword) {
      setMessage({ type: 'error', text: 'Por favor ingresa tu contraseña actual' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Las contraseñas nuevas no coinciden' });
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'La contraseña debe tener al menos 6 caracteres' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        setMessage({ type: 'error', text: 'No se pudo actualizar la contraseña: ' + updateError.message });
        return;
      }

      // Limpiamos el formulario
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setMessage({ type: 'success', text: 'Tu contraseña ha sido actualizada correctamente' });

      // Cerramos el modal después de 2 segundos
      setTimeout(() => {
        setIsChangePasswordVisible(false);
        setMessage({ type: '', text: '' });
      }, 2000);

    } catch (error: any) {
      console.error('Error al cambiar contraseña:', error);
      setMessage({ type: 'error', text: 'Ocurrió un error al intentar cambiar la contraseña' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image
          source={user?.profilePicture ? { uri: user.profilePicture } : require('../../assets/icons/avatar.png')}
          style={styles.avatar}
        />
        <Text style={styles.username}>{user?.username}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{totalPoints}</Text>
          <Text style={styles.statLabel}>Puntos</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{completedMissions.length}</Text>
          <Text style={styles.statLabel}>Misiones</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{totalCities}</Text>
          <Text style={styles.statLabel}>Ciudades</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Estadísticas del Diario</Text>
        <View style={styles.journalStats}>
          <Text style={styles.journalStat}>Total de entradas: {totalEntries}</Text>
          <Text style={styles.journalStat}>Ciudades visitadas: {totalCities}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Seguridad</Text>
        <View style={styles.privacyContainer}>
          <TouchableOpacity
            style={styles.privacyButton}
            onPress={() => setIsChangePasswordVisible(true)}
          >
            <Text style={styles.privacyButtonTitle}>Cambiar Contraseña</Text>
          </TouchableOpacity>
          <Text style={styles.privacyDescription}>
            Actualiza tu contraseña para mantener tu cuenta segura
          </Text>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
      </TouchableOpacity>

      <Modal
        visible={isChangePasswordVisible}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cambiar Contraseña</Text>

            {message.text ? (
              <Text style={[
                styles.messageText,
                message.type === 'error' ? styles.errorMessage : styles.successMessage
              ]}>
                {message.text}
              </Text>
            ) : null}

            <TextInput
              style={styles.input}
              placeholder="Contraseña actual"
              secureTextEntry
              value={currentPassword}
              onChangeText={(text) => {
                setCurrentPassword(text);
                setMessage({ type: '', text: '' });
              }}
            />

            <TextInput
              style={styles.input}
              placeholder="Nueva contraseña"
              secureTextEntry
              value={newPassword}
              onChangeText={(text) => {
                setNewPassword(text);
                setMessage({ type: '', text: '' });
              }}
            />

            <TextInput
              style={styles.input}
              placeholder="Confirmar nueva contraseña"
              secureTextEntry
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                setMessage({ type: '', text: '' });
              }}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setIsChangePasswordVisible(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                  setMessage({ type: '', text: '' });
                }}
              >
                <Text style={styles.modalButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.saveButton,
                  loading && styles.disabledButton
                ]}
                onPress={handleChangePassword}
                disabled={loading}
              >
                <Text style={styles.modalButtonText}>
                  {loading ? 'Guardando...' : 'Guardar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#4CAF50',
    padding: 20,
    alignItems: 'center',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 10,
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  email: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    backgroundColor: 'white',
    marginTop: -20,
    marginHorizontal: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statCard: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    margin: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  journalStats: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  journalStat: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  logoutButton: {
    margin: 20,
    backgroundColor: '#f44336',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#f44336',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },
  modalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  messageText: {
    textAlign: 'center',
    marginBottom: 15,
    padding: 10,
    borderRadius: 5,
  },
  errorMessage: {
    backgroundColor: '#ffebee',
    color: '#c62828',
  },
  successMessage: {
    backgroundColor: '#e8f5e9',
    color: '#2e7d32',
  },
  disabledButton: {
    opacity: 0.7,
  },
  privacyContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
    padding: 15,
  },
  privacyButton: {
    backgroundColor: '#2196F3',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  privacyButtonTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  privacyDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

export default ProfileScreen; 