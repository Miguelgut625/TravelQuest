import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#f5f5f5',
      padding: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    logoContainer: {
      alignItems: 'center',
      marginTop: 60,
      marginBottom: 40,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#333',
      marginBottom: 20,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 16,
      color: '#666',
      marginBottom: 20,
      textAlign: 'center',
    },
    formContainer: {
      flex: 1,
      justifyContent: 'center',
    },
    input: {
      width: '100%',
      height: 50,
      backgroundColor: 'white',
      borderRadius: 10,
      paddingHorizontal: 15,
      padding: 15,
      marginBottom: 15,
      borderWidth: 1,
      borderColor: '#ddd',
      fontSize: 16,
    },
    button: {
      width: '100%',
      height: 50,
      backgroundColor: '#4CAF50',
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 10,
      padding: 15,
      marginBottom: 15,
    },
    buttonDisabled: {
      backgroundColor: '#cccccc',
    },
    buttonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: 'bold',
    },
    forgotPasswordButton: {
      marginTop: 15,
      alignItems: 'center',
    },
    forgotPasswordText: {
      color: '#4CAF50',
      fontSize: 14,
      textDecorationLine: 'underline',
    },
    link: {
      color: '#4CAF50',
      fontSize: 14,
      marginTop: 20,
      textAlign: 'center',
      textDecorationLine: 'underline',
    },
    errorText: {
      color: '#f44336',
      marginBottom: 10,
      marginTop: 10,
      textAlign: 'center',
    },
    cancelButton: {
      marginTop: 20,
      alignItems: 'center',
    },
    cancelButtonText: {
      color: '#666',
      fontSize: 16,
    },
    resendButton: {
      marginTop: 15,
      padding: 10,
      alignItems: 'center',
    },
    resendButtonText: {
      color: '#4CAF50',
      fontSize: 16,
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
    backButton: {
      marginTop: 10,
    },
    backButtonText: {
      color: '#4CAF50',
      fontSize: 14,
      textDecorationLine: 'underline',
    },
});

export default styles;