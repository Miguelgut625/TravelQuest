"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LOGGING_CONFIG = void 0;
// Configuración de logs para la aplicación
exports.LOGGING_CONFIG = {
    // Habilita o deshabilita todos los logs
    ENABLED: __DEV__, // Solo muestra logs en desarrollo
    // Habilita o deshabilita categorías específicas
    CATEGORIES: {
        AUTH: false, // Deshabilita específicamente los logs de autenticación
        API: __DEV__,
        NAVIGATION: __DEV__,
    }
};
