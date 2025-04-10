"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchCities = exports.verifyCredentials = exports.updateMissionProgress = exports.getMissionsByCity = exports.uploadImage = exports.testAuth = exports.supabase = void 0;
var supabase_js_1 = require("@supabase/supabase-js");
var async_storage_1 = require("@react-native-async-storage/async-storage");
require("react-native-url-polyfill/auto");
var logging_1 = require("../config/logging");
var supabaseUrl = 'https://ynyxyzzpbyzyejgkfncm.supabase.co';
var supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlueXh5enpwYnl6eWVqZ2tmbmNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE3ODI4NDMsImV4cCI6MjA1NzM1ODg0M30.ntEnr5gFT5tllc0Z037LJPkPq60SM_RBLa6hct72xXs';
exports.supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: async_storage_1.default,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        flowType: 'implicit',
        debug: logging_1.LOGGING_CONFIG.CATEGORIES.AUTH
    }
});
// Función para probar la autenticación
var testAuth = function (email, password) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, data, error, error_1;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 2, , 3]);
                console.log('Probando autenticación con:', { email: email });
                return [4 /*yield*/, exports.supabase.auth.signInWithPassword({
                        email: email,
                        password: password
                    })];
            case 1:
                _a = _c.sent(), data = _a.data, error = _a.error;
                if (error) {
                    console.error('Error en prueba de autenticación:', {
                        message: error.message,
                        status: error.status,
                        name: error.name
                    });
                    return [2 /*return*/, { success: false, error: error }];
                }
                console.log('Prueba de autenticación exitosa:', {
                    user: (_b = data.user) === null || _b === void 0 ? void 0 : _b.email,
                    session: !!data.session
                });
                return [2 /*return*/, { success: true, data: data }];
            case 2:
                error_1 = _c.sent();
                console.error('Error inesperado en prueba de autenticación:', error_1);
                return [2 /*return*/, { success: false, error: error_1 }];
            case 3: return [2 /*return*/];
        }
    });
}); };
exports.testAuth = testAuth;
// Funciones auxiliares para interactuar con Supabase
var uploadImage = function (filePath, bucket) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, data, error, error_2;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                return [4 /*yield*/, exports.supabase.storage
                        .from(bucket)
                        .upload(filePath, filePath)];
            case 1:
                _a = _b.sent(), data = _a.data, error = _a.error;
                if (error)
                    throw error;
                return [2 /*return*/, data];
            case 2:
                error_2 = _b.sent();
                console.error('Error uploading image:', error_2);
                throw error_2;
            case 3: return [2 /*return*/];
        }
    });
}); };
exports.uploadImage = uploadImage;
var getMissionsByCity = function (cityId) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, data, error, error_3;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                return [4 /*yield*/, exports.supabase
                        .from('missions')
                        .select('*')
                        .eq('cityId', cityId)];
            case 1:
                _a = _b.sent(), data = _a.data, error = _a.error;
                if (error)
                    throw error;
                return [2 /*return*/, data];
            case 2:
                error_3 = _b.sent();
                console.error('Error fetching missions:', error_3);
                throw error_3;
            case 3: return [2 /*return*/];
        }
    });
}); };
exports.getMissionsByCity = getMissionsByCity;
var updateMissionProgress = function (missionId, userId, completed) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, data, error, error_4;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                return [4 /*yield*/, exports.supabase
                        .from('mission_progress')
                        .upsert({
                        mission_id: missionId,
                        user_id: userId,
                        completed: completed,
                        updated_at: new Date().toISOString(),
                    })];
            case 1:
                _a = _b.sent(), data = _a.data, error = _a.error;
                if (error)
                    throw error;
                return [2 /*return*/, data];
            case 2:
                error_4 = _b.sent();
                console.error('Error updating mission progress:', error_4);
                throw error_4;
            case 3: return [2 /*return*/];
        }
    });
}); };
exports.updateMissionProgress = updateMissionProgress;
// Función para verificar credenciales de forma segura
var verifyCredentials = function (email, password) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, authData, authError, _b, userData, userError, userInfo, error_5;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 3, , 4]);
                console.log('Verificando credenciales para:', email);
                return [4 /*yield*/, exports.supabase.auth.signInWithPassword({
                        email: email,
                        password: password
                    })];
            case 1:
                _a = _c.sent(), authData = _a.data, authError = _a.error;
                if (authError) {
                    console.error('Error en autenticación:', authError);
                    return [2 /*return*/, { success: false, error: authError }];
                }
                if (!authData.user) {
                    console.log('No se encontró el usuario');
                    return [2 /*return*/, { success: false, error: new Error('Usuario no encontrado') }];
                }
                return [4 /*yield*/, exports.supabase
                        .from('users')
                        .select('*')
                        .eq('email', email)
                        .single()];
            case 2:
                _b = _c.sent(), userData = _b.data, userError = _b.error;
                if (userError) {
                    console.error('Error obteniendo datos del usuario:', userError);
                    return [2 /*return*/, { success: false, error: userError }];
                }
                userInfo = __assign(__assign({}, userData), { email: authData.user.email });
                console.log('Autenticación exitosa para:', email);
                return [2 /*return*/, { success: true, data: userInfo }];
            case 3:
                error_5 = _c.sent();
                console.error('Error inesperado en autenticación:', error_5);
                return [2 /*return*/, { success: false, error: error_5 }];
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.verifyCredentials = verifyCredentials;
var searchCities = function (searchTerm) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, data, error, error_6;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                return [4 /*yield*/, exports.supabase
                        .from('cities')
                        .select('*')
                        .ilike('name', "%".concat(searchTerm, "%"))
                        .limit(5)];
            case 1:
                _a = _b.sent(), data = _a.data, error = _a.error;
                if (error)
                    throw error;
                return [2 /*return*/, data || []];
            case 2:
                error_6 = _b.sent();
                console.error('Error searching cities:', error_6);
                return [2 /*return*/, []];
            case 3: return [2 /*return*/];
        }
    });
}); };
exports.searchCities = searchCities;
