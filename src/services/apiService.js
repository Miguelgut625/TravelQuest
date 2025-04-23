import { API_ENDPOINTS, API_HEADERS, getAuthHeaders, API_TIMEOUT } from '../config/apiConfig';

/**
 * Servicio para realizar peticiones a la API de TravelQuest
 */
class ApiService {
  /**
   * Método genérico para realizar peticiones HTTP
   * @param {string} url - URL del endpoint
   * @param {string} method - Método HTTP (GET, POST, PUT, DELETE)
   * @param {object} data - Datos a enviar (para POST, PUT)
   * @param {boolean} requiresAuth - Si la petición requiere autenticación
   * @returns {Promise<any>} - Respuesta de la API
   */
  async request(url, method = 'GET', data = null, requiresAuth = false) {
    try {
      const options = {
        method,
        headers: API_HEADERS,
        timeout: API_TIMEOUT
      };

      // Añadir token si es necesario
      if (requiresAuth) {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No hay token de autenticación');
        }
        options.headers = getAuthHeaders(token);
      }

      // Añadir body para POST y PUT
      if (data && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(data);
      }

      const response = await fetch(url, options);
      
      // Verificar si la respuesta es exitosa
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.msg || 'Error en la petición');
      }

      return await response.json();
    } catch (error) {
      console.error('Error en petición API:', error);
      throw error;
    }
  }

  // ====== Métodos para Autenticación ======

  /**
   * Iniciar sesión
   * @param {string} email - Email del usuario
   * @param {string} password - Contraseña del usuario
   * @returns {Promise<{token: string, user: object}>} - Token y datos del usuario
   */
  async login(email, password) {
    return await this.request(API_ENDPOINTS.AUTH.LOGIN, 'POST', { email, password });
  }

  /**
   * Registrar nuevo usuario
   * @param {string} username - Nombre de usuario
   * @param {string} email - Email del usuario
   * @param {string} password - Contraseña del usuario
   * @returns {Promise<{token: string}>} - Token de autenticación
   */
  async register(username, email, password) {
    return await this.request(API_ENDPOINTS.AUTH.REGISTER, 'POST', { username, email, password });
  }

  /**
   * Obtener datos del usuario autenticado
   * @returns {Promise<object>} - Datos del usuario
   */
  async getMe() {
    return await this.request(API_ENDPOINTS.AUTH.ME, 'GET', null, true);
  }

  /**
   * Actualizar perfil de usuario
   * @param {object} userData - Datos a actualizar
   * @returns {Promise<object>} - Datos actualizados
   */
  async updateProfile(userData) {
    return await this.request(API_ENDPOINTS.AUTH.PROFILE, 'PUT', userData, true);
  }

  // ====== Métodos para Misiones ======

  /**
   * Obtener todas las misiones
   * @returns {Promise<Array>} - Lista de misiones
   */
  async getMissions() {
    return await this.request(API_ENDPOINTS.MISSIONS.ALL);
  }

  /**
   * Obtener misiones por ciudad
   * @param {string} cityId - ID de la ciudad
   * @returns {Promise<Array>} - Lista de misiones
   */
  async getMissionsByCity(cityId) {
    return await this.request(API_ENDPOINTS.MISSIONS.BY_CITY(cityId));
  }

  /**
   * Obtener misiones cercanas a una ubicación
   * @param {number} lat - Latitud
   * @param {number} lng - Longitud
   * @param {number} maxDistance - Distancia máxima en metros
   * @returns {Promise<Array>} - Lista de misiones
   */
  async getNearbyMissions(lat, lng, maxDistance = 10000) {
    const url = `${API_ENDPOINTS.MISSIONS.NEARBY}?lat=${lat}&lng=${lng}&maxDistance=${maxDistance}`;
    return await this.request(url);
  }

  /**
   * Obtener una misión por ID
   * @param {string} id - ID de la misión
   * @returns {Promise<object>} - Datos de la misión
   */
  async getMissionById(id) {
    return await this.request(API_ENDPOINTS.MISSIONS.DETAIL(id));
  }

  // Añadir más métodos según sea necesario para otros endpoints...
}

// Exportar una instancia única
export default new ApiService(); 