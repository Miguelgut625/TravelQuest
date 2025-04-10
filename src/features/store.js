"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.persistor = exports.store = void 0;
var toolkit_1 = require("@reduxjs/toolkit");
var redux_persist_1 = require("redux-persist");
var authSlice_1 = require("./auth/authSlice");
var missionSlice_1 = require("./missionSlice");
var journalSlice_1 = require("../features/journalSlice");
var async_storage_1 = require("@react-native-async-storage/async-storage");
var journeySlice_1 = require("./journey/journeySlice");
var persistConfig = {
    key: 'root',
    storage: async_storage_1.default,
    whitelist: ['auth'],
    blacklist: ['missions', 'journal', 'journey'],
    debug: true, // Habilitar logs de depuración
    timeout: 0, // Evitar timeout en la persistencia
    writeFailHandler: function (err) {
        console.error('Error al persistir el estado:', err);
    }
};
var persistedAuthReducer = (0, redux_persist_1.persistReducer)(persistConfig, authSlice_1.default);
exports.store = (0, toolkit_1.configureStore)({
    reducer: {
        auth: persistedAuthReducer,
        missions: missionSlice_1.default,
        journal: journalSlice_1.default,
        journey: journeySlice_1.default,
    },
    middleware: function (getDefaultMiddleware) {
        return getDefaultMiddleware({
            serializableCheck: {
                ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
            },
        });
    },
});
exports.persistor = (0, redux_persist_1.persistStore)(exports.store);
// Agregar listener para depuración
exports.store.subscribe(function () {
    var state = exports.store.getState();
    console.log('Estado actual:', {
        auth: state.auth,
        missions: state.missions,
        journal: state.journal,
        journey: state.journey
    });
});
