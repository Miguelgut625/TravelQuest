// URL base de la API
// En desarrollo, usa la IP de tu computadora en la red local
// Ejemplo: si tu IP es 192.168.1.100, usa esa IP
export const API_URL = 'http://192.168.1.185:5000/api';

// En producción, usaríamos la URL real del servidor
// export const API_URL = 'https://api.travelquest.com/api';

// Exportar la URL de la API para uso en el backend
export const APP_URL = process.env.NODE_ENV === 'production' 
  ? 'https://api.travelquest.com/api'
  : 'http://192.168.1.185:5000/api'; 