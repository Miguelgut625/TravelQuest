/**
 * Shims para los módulos de Supabase que faltan
 */

// Shim para @supabase/functions-js
export const functionsShim = {
  FunctionsClient: class FunctionsClient {
    constructor() {
      this.url = '';
      this.headers = {};
    }

    invoke() {
      console.warn('Using FunctionsClient Shim - No real function will be invoked');
      return Promise.resolve({
        data: null,
        error: null
      });
    }
  }
};

// Shim para @supabase/realtime-js
export const realtimeShim = {
  RealtimeClient: class RealtimeClient {
    constructor() {
      this.channels = [];
    }

    connect() {
      console.warn('Using RealtimeClient Shim - No real connection will be established');
      return this;
    }

    disconnect() {
      return this;
    }

    channel() {
      return {
        subscribe: () => {
          return {
            receive: () => {},
            on: () => {},
            off: () => {},
          };
        },
        unsubscribe: () => {},
      };
    }
  }
};

// Shim para @supabase/storage-js
export const storageShim = {
  StorageClient: class StorageClient {
    constructor() {
      this.url = '';
      this.headers = {};
    }

    from() {
      return {
        upload: () => {
          console.warn('Using StorageClient Shim - No real upload will occur');
          return Promise.resolve({
            data: { path: 'mock-path' },
            error: null
          });
        },
        download: () => {
          return Promise.resolve({
            data: new Blob(),
            error: null
          });
        },
        list: () => {
          return Promise.resolve({
            data: [],
            error: null
          });
        },
        remove: () => {
          return Promise.resolve({
            data: null,
            error: null
          });
        },
        getPublicUrl: () => {
          return {
            data: { publicUrl: 'https://example.com/mock-url' }
          };
        },
      };
    }
  }
};

// Exportar todo para usarlo como:
// import { functionsShim, realtimeShim, storageShim } from './supabase-shims'; 