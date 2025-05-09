/**
 * Shim para resolver problemas con react-native-maps en entornos de Expo/Metro
 */

// Verificar si el módulo RNMapsAirModule existe o proporcionar una implementación alternativa
if (!global.RNMapsAirModule) {
  // Este es un shim básico para evitar errores en entornos donde el módulo nativo no está disponible
  global.RNMapsAirModule = {
    // Implementación ficticia de métodos que podrían ser llamados
    getConstants: () => ({}),
    createMarker: () => undefined,
    createMap: () => undefined,
    // Añadir más métodos según sea necesario
  };
  
  console.warn('RNMapsAirModule shim loaded - funcionalidad limitada disponible');
}

export default {}; 