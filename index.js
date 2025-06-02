/**
 * Polyfill global para require - DEBE ejecutarse ANTES que cualquier otra cosa
 */

// Definir require globalmente si no existe
if (typeof global.require === 'undefined') {
  global.require = function(moduleName) {
    console.warn(`require('${moduleName}') llamado - usando shim`);
    
    // Para módulos comunes que podrían ser requeridos, devolver objetos vacíos
    switch (moduleName) {
      case 'buffer':
        return { Buffer: global.Buffer || class Buffer {} };
      case 'process':
        return global.process || { env: {} };
      case 'stream':
        return {};
      case 'crypto':
        return {};
      case 'fs':
        return {};
      case 'path':
        return {};
      default:
        // Para cualquier otro módulo, devolver un objeto vacío
        return {};
    }
  };
}

// Asegurar que Buffer y process existen
if (typeof global.Buffer === 'undefined') {
  global.Buffer = class Buffer {
    constructor() {}
    static from() { return new Buffer(); }
    static alloc() { return new Buffer(); }
    toString() { return ''; }
  };
}

if (typeof global.process === 'undefined') {
  global.process = {
    env: {},
    nextTick: (fn) => setTimeout(fn, 0),
    version: 'v16.0.0',
    platform: 'react-native'
  };
}

console.log('✅ Polyfill global para require aplicado');

import { registerRootComponent } from 'expo';
import App from './App';

// Registramos el componente raíz
registerRootComponent(App); 