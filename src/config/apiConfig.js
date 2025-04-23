// Configuración de conexión API para TravelQuest

// Entorno de desarrollo o producción
const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

// Configuración de URL base de API
export const API_BASE_URL = isDev 
  ? 'http://localhost:5000/api' 
  : 'https://api.travelquest.com/api';

// Endpoints API
export const API_ENDPOINTS = {
  // Autenticación
  AUTH: {
    LOGIN: `${API_BASE_URL}/auth/login`,
    REGISTER: `${API_BASE_URL}/auth/register`,
    ME: `${API_BASE_URL}/auth/me`,
    PROFILE: `${API_BASE_URL}/auth/profile`,
  },
  
  // Misiones
  MISSIONS: {
    ALL: `${API_BASE_URL}/missions`,
    BY_CITY: (cityId) => `${API_BASE_URL}/missions/city/${cityId}`,
    NEARBY: `${API_BASE_URL}/missions/nearby`,
    DETAIL: (id) => `${API_BASE_URL}/missions/${id}`,
  },
  
  // Ciudades
  CITIES: {
    ALL: `${API_BASE_URL}/cities`,
    SEARCH: `${API_BASE_URL}/cities/search`,
    DETAIL: (id) => `${API_BASE_URL}/cities/${id}`,
  },
  
  // Usuarios
  USERS: {
    PROFILE: (id) => `${API_BASE_URL}/users/${id}`,
    FRIENDS: (id) => `${API_BASE_URL}/users/${id}/friends`,
    REQUEST_FRIEND: `${API_BASE_URL}/users/friend-request`,
  },
  
  // Diario
  JOURNAL: {
    ALL: `${API_BASE_URL}/journal`,
    BY_USER: (userId) => `${API_BASE_URL}/journal/user/${userId}`,
    DETAIL: (id) => `${API_BASE_URL}/journal/${id}`,
  },
  
  // Grupos
  GROUPS: {
    ALL: `${API_BASE_URL}/groups`,
    DETAIL: (id) => `${API_BASE_URL}/groups/${id}`,
    MEMBERS: (id) => `${API_BASE_URL}/groups/${id}/members`,
  },
  
  // Mensajes
  MESSAGES: {
    CONVERSATION: (id) => `${API_BASE_URL}/messages/conversation/${id}`,
    SEND: `${API_BASE_URL}/messages`,
  },
  
  // Insignias
  BADGES: {
    ALL: `${API_BASE_URL}/badges`,
    USER: (userId) => `${API_BASE_URL}/badges/user/${userId}`,
  },
};

// Headers para peticiones API
export const API_HEADERS = {
  'Content-Type': 'application/json',
};

// Función para añadir token de autenticación a los headers
export const getAuthHeaders = (token) => ({
  ...API_HEADERS,
  'x-auth-token': token,
});

// Tiempo de espera para peticiones API (en ms)
export const API_TIMEOUT = 30000; // 30 segundos 