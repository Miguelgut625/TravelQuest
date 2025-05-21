"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function (t) {
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
    var _ = { label: 0, sent: function () { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function () { return this; }), g;
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createJournalEntry = exports.getMissionJournalEntries = exports.getUserJournalEntries = exports.checkJournalTables = exports.addPhotoToEntry = exports.addCommentToEntry = exports.getJournalEntryById = exports.getCommentsByEntryId = exports.addCommentToEntryTable = void 0;
var supabase_1 = require("./supabase");
/**
 * Verifica si existe la tabla journal_entries o journey_diary en la base de datos
 * @returns objeto con la información de qué tablas existen
 */
var checkJournalTables = function () {
    return __awaiter(void 0, void 0, void 0, function () {
        var _a, journalEntriesResult, journeyDiaryResult, error_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, Promise.allSettled([
                        supabase_1.supabase.from('journal_entries').select('id').limit(1),
                        supabase_1.supabase.from('journey_diary').select('id').limit(1)
                    ])];
                case 1:
                    _a = _b.sent(), journalEntriesResult = _a[0], journeyDiaryResult = _a[1];
                    return [2 /*return*/, {
                        journalEntriesExists: journalEntriesResult.status === 'fulfilled' && !journalEntriesResult.value.error,
                        journeyDiaryExists: journeyDiaryResult.status === 'fulfilled' && !journeyDiaryResult.value.error
                    }];
                case 2:
                    error_1 = _b.sent();
                    console.error('Error verificando tablas del diario:', error_1);
                    return [2 /*return*/, {
                        journalEntriesExists: false,
                        journeyDiaryExists: false
                    }];
                case 3: return [2 /*return*/];
            }
        });
    });
};
exports.checkJournalTables = checkJournalTables;
/**
 * Obtiene todas las entradas del diario del usuario agrupadas por ciudad
 * @param userId ID del usuario
 * @returns Entradas del diario agrupadas por ciudad
 */
var getUserJournalEntries = function (userId) {
    return __awaiter(void 0, void 0, void 0, function () {
        var _a, journalEntriesExists, journeyDiaryExists, entriesData, error, _b, data, entriesError, _c, basicData, basicError, _d, altData, altError, e_1, e_2, possibleQueries, _i, possibleQueries_1, query, _e, diaryData, diaryError, e_3, e_4, error_2;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    _f.trys.push([0, 25, , 26]);
                    return [4 /*yield*/, (0, exports.checkJournalTables)()];
                case 1:
                    _a = _f.sent(), journalEntriesExists = _a.journalEntriesExists, journeyDiaryExists = _a.journeyDiaryExists;
                    if (!journalEntriesExists && !journeyDiaryExists) {
                        console.warn('No se encontraron tablas para el diario (journal_entries o journey_diary)');
                        return [2 /*return*/, {}]; // Devolvemos un objeto vacío
                    }
                    entriesData = null;
                    error = null;
                    if (!journalEntriesExists) return [3 /*break*/, 15];
                    _f.label = 2;
                case 2:
                    _f.trys.push([2, 14, , 15]);
                    return [4 /*yield*/, supabase_1.supabase
                        .from('journal_entries')
                        .select("\n            *,\n            cities:cityid (\n              name\n            )\n          ")
                        .eq('userid', userId)
                        .order('created_at', { ascending: false })];
                case 3:
                    _b = _f.sent(), data = _b.data, entriesError = _b.error;
                    if (!!entriesError) return [3 /*break*/, 4];
                    entriesData = data;
                    return [3 /*break*/, 13];
                case 4:
                    if (!(entriesError.message && (entriesError.message.includes('cityid') ||
                        entriesError.message.includes('cityId') ||
                        entriesError.message.includes('relationship') ||
                        entriesError.code === 'PGRST200' ||
                        entriesError.code === '42703'))) return [3 /*break*/, 12];
                    _f.label = 5;
                case 5:
                    _f.trys.push([5, 10, , 11]);
                    return [4 /*yield*/, supabase_1.supabase
                        .from('journal_entries')
                        .select('*')
                        .eq('userid', userId)
                        .order('created_at', { ascending: false })];
                case 6:
                    _c = _f.sent(), basicData = _c.data, basicError = _c.error;
                    if (!!basicError) return [3 /*break*/, 7];
                    entriesData = basicData;
                    return [3 /*break*/, 9];
                case 7: return [4 /*yield*/, supabase_1.supabase
                    .from('journal_entries')
                    .select('*')
                    .eq('user_id', userId)
                    .order('created_at', { ascending: false })];
                case 8:
                    _d = _f.sent(), altData = _d.data, altError = _d.error;
                    if (!altError) {
                        entriesData = altData;
                    }
                    else {
                        error = altError;
                    }
                    _f.label = 9;
                case 9: return [3 /*break*/, 11];
                case 10:
                    e_1 = _f.sent();
                    console.warn('Error al obtener datos sin relación:', e_1);
                    return [3 /*break*/, 11];
                case 11: return [3 /*break*/, 13];
                case 12:
                    error = entriesError;
                    _f.label = 13;
                case 13: return [3 /*break*/, 15];
                case 14:
                    e_2 = _f.sent();
                    console.warn('Error al obtener datos de journal_entries:', e_2);
                    return [3 /*break*/, 15];
                case 15:
                    if (!(!entriesData && journeyDiaryExists)) return [3 /*break*/, 24];
                    _f.label = 16;
                case 16:
                    _f.trys.push([16, 23, , 24]);
                    possibleQueries = [
                        // Versión 1: Lowercase
                        supabase_1.supabase.from('journey_diary').select('*').eq('userid', userId).order('created_at', { ascending: false }),
                        // Versión 2: Underscore
                        supabase_1.supabase.from('journey_diary').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
                    ];
                    _i = 0, possibleQueries_1 = possibleQueries;
                    _f.label = 17;
                case 17:
                    if (!(_i < possibleQueries_1.length)) return [3 /*break*/, 22];
                    query = possibleQueries_1[_i];
                    _f.label = 18;
                case 18:
                    _f.trys.push([18, 20, , 21]);
                    return [4 /*yield*/, query];
                case 19:
                    _e = _f.sent(), diaryData = _e.data, diaryError = _e.error;
                    if (!diaryError && diaryData && diaryData.length > 0) {
                        entriesData = diaryData;
                        return [3 /*break*/, 22];
                    }
                    return [3 /*break*/, 21];
                case 20:
                    e_3 = _f.sent();
                    // Continuar con la siguiente consulta
                    console.warn('Error en consulta alternativa:', e_3);
                    return [3 /*break*/, 21];
                case 21:
                    _i++;
                    return [3 /*break*/, 17];
                case 22: return [3 /*break*/, 24];
                case 23:
                    e_4 = _f.sent();
                    console.warn('Error al obtener datos de journey_diary:', e_4);
                    return [3 /*break*/, 24];
                case 24:
                    // Si después de intentar con ambas tablas seguimos sin datos y tenemos un error, lo lanzamos
                    if (!entriesData && error) {
                        throw error;
                    }
                    // Si no hay datos (pero no hubo error), devolvemos un objeto vacío
                    if (!entriesData) {
                        return [2 /*return*/, {}];
                    }
                    // Organizar las entradas por ciudad
                    return [2 /*return*/, organizeCityEntries(entriesData, true)];
                case 25:
                    error_2 = _f.sent();
                    console.error('Error obteniendo entradas del diario:', error_2);
                    throw error_2;
                case 26: return [2 /*return*/];
            }
        });
    });
};
exports.getUserJournalEntries = getUserJournalEntries;
/**
 * Organiza las entradas del diario por ciudad
 * @param data Datos de las entradas
 * @param missingCityRelation Indica si falta la relación con la ciudad
 * @returns Entradas organizadas por ciudad
 */
var organizeCityEntries = function (data, missingCityRelation) {
    if (missingCityRelation === void 0) { missingCityRelation = false; }
    var entriesByCity = {};
    if (!data || data.length === 0) {
        return entriesByCity;
    }
    data.forEach(function (entry) {
        var _a, _b;
        // Intentar todas las posibles formas del nombre de la ciudad
        var cityName = 'Ciudad Desconocida';
        // Orden de prioridad para obtener el nombre de la ciudad
        if (!missingCityRelation && ((_a = entry.cities) === null || _a === void 0 ? void 0 : _a.name)) {
            cityName = entry.cities.name;
        }
        else if (entry.city_name) {
            cityName = entry.city_name;
        }
        else if (entry.cityName) {
            cityName = entry.cityName;
        }
        else if (entry.cityname) {
            cityName = entry.cityname;
        }
        else if (entry.cities && entry.cities.name) {
            cityName = entry.cities.name;
        }
        else if ((_b = entry.city) === null || _b === void 0 ? void 0 : _b.name) {
            cityName = entry.city.name;
        }
        else {
            // Buscar en las etiquetas cualquier nombre que parezca ser de ciudad
            if (entry.tags && Array.isArray(entry.tags)) {
                // Filtrar tags comunes que no son ciudades
                var commonTags_1 = ['misión', 'mission', 'viaje', 'travel', 'foto', 'photo'];
                var possibleCityTag = entry.tags.find(function (tag) {
                    return !commonTags_1.includes(tag.toLowerCase()) &&
                        tag.charAt(0).toUpperCase() === tag.charAt(0);
                } // Primera letra mayúscula
                );
                if (possibleCityTag) {
                    cityName = possibleCityTag;
                }
            }
            // Buscar en el contenido de la entrada
            if (cityName === 'Ciudad Desconocida' && entry.content) {
                var contentMatch = entry.content.match(/(?:en|in) ([A-Za-z\s]+)\.$/);
                if (contentMatch && contentMatch[1]) {
                    cityName = contentMatch[1].trim();
                }
            }
        }
        if (!entriesByCity[cityName]) {
            entriesByCity[cityName] = [];
        }
        // Nos aseguramos de que todos los campos necesarios existan
        var processedEntry = {
            id: entry.id || "generated-".concat(Date.now(), "-").concat(Math.random().toString(36).substring(2, 9)),
            userId: entry.userId || entry.user_id || entry.userid || '',
            cityId: entry.cityId || entry.city_id || entry.cityid || '',
            missionId: entry.missionId || entry.mission_id || entry.missionid || undefined,
            title: entry.title || 'Entrada sin título',
            content: entry.content || '',
            photos: Array.isArray(entry.photos) ? entry.photos :
                (entry.photos ? [entry.photos] : []),
            location: entry.location || null,
            created_at: entry.created_at || new Date().toISOString(),
            tags: Array.isArray(entry.tags) ? entry.tags : [],
            city_name: cityName
        };
        entriesByCity[cityName].push(processedEntry);
    });
    return entriesByCity;
};
/**
 * Obtiene las entradas del diario relacionadas con una misión específica
 * @param userId ID del usuario
 * @param missionId ID de la misión
 * @returns Entradas del diario relacionadas con la misión
 */
var getMissionJournalEntries = function (userId, missionId) {
    return __awaiter(void 0, void 0, void 0, function () {
        var _a, journalEntriesExists, journeyDiaryExists, entriesData, error, _b, data, entriesError, _c, basicData, basicError, e_5, _d, data, diaryError, _e, basicData, basicError, e_6, error_3;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    _f.trys.push([0, 18, , 19]);
                    return [4 /*yield*/, (0, exports.checkJournalTables)()];
                case 1:
                    _a = _f.sent(), journalEntriesExists = _a.journalEntriesExists, journeyDiaryExists = _a.journeyDiaryExists;
                    if (!journalEntriesExists && !journeyDiaryExists) {
                        console.warn('No se encontraron tablas para el diario (journal_entries o journey_diary)');
                        return [2 /*return*/, []]; // Devolvemos un array vacío
                    }
                    entriesData = null;
                    error = null;
                    if (!journalEntriesExists) return [3 /*break*/, 9];
                    _f.label = 2;
                case 2:
                    _f.trys.push([2, 8, , 9]);
                    return [4 /*yield*/, supabase_1.supabase
                        .from('journal_entries')
                        .select("\n            *,\n            cities:cityId (\n              name\n            )\n          ")
                        .eq('userId', userId)
                        .eq('missionId', missionId)
                        .order('created_at', { ascending: false })];
                case 3:
                    _b = _f.sent(), data = _b.data, entriesError = _b.error;
                    if (!!entriesError) return [3 /*break*/, 4];
                    entriesData = data;
                    return [3 /*break*/, 7];
                case 4:
                    if (!(entriesError.message && (entriesError.message.includes('cityId') ||
                        entriesError.message.includes('relationship') ||
                        entriesError.code === 'PGRST200'))) return [3 /*break*/, 6];
                    return [4 /*yield*/, supabase_1.supabase
                        .from('journal_entries')
                        .select('*')
                        .eq('userId', userId)
                        .eq('missionId', missionId)
                        .order('created_at', { ascending: false })];
                case 5:
                    _c = _f.sent(), basicData = _c.data, basicError = _c.error;
                    if (!basicError) {
                        entriesData = basicData;
                    }
                    else {
                        error = basicError;
                    }
                    return [3 /*break*/, 7];
                case 6:
                    error = entriesError;
                    _f.label = 7;
                case 7: return [3 /*break*/, 9];
                case 8:
                    e_5 = _f.sent();
                    console.warn('Error al obtener datos de journal_entries para misión:', e_5);
                    return [3 /*break*/, 9];
                case 9:
                    if (!(!entriesData && journeyDiaryExists)) return [3 /*break*/, 17];
                    _f.label = 10;
                case 10:
                    _f.trys.push([10, 16, , 17]);
                    return [4 /*yield*/, supabase_1.supabase
                        .from('journey_diary')
                        .select("\n            *,\n            cities:cityId (\n              name\n            )\n          ")
                        .eq('userId', userId)
                        .eq('missionId', missionId)
                        .order('created_at', { ascending: false })];
                case 11:
                    _d = _f.sent(), data = _d.data, diaryError = _d.error;
                    if (!!diaryError) return [3 /*break*/, 12];
                    entriesData = data;
                    return [3 /*break*/, 15];
                case 12:
                    if (!(diaryError.message && (diaryError.message.includes('cityId') ||
                        diaryError.message.includes('relationship') ||
                        diaryError.code === 'PGRST200'))) return [3 /*break*/, 14];
                    return [4 /*yield*/, supabase_1.supabase
                        .from('journey_diary')
                        .select('*')
                        .eq('userId', userId)
                        .eq('missionId', missionId)
                        .order('created_at', { ascending: false })];
                case 13:
                    _e = _f.sent(), basicData = _e.data, basicError = _e.error;
                    if (!basicError) {
                        entriesData = basicData;
                    }
                    else if (!error) { // Solo guardamos este error si no teníamos uno previo
                        error = basicError;
                    }
                    return [3 /*break*/, 15];
                case 14:
                    if (!error) { // Solo guardamos este error si no teníamos uno previo
                        error = diaryError;
                    }
                    _f.label = 15;
                case 15: return [3 /*break*/, 17];
                case 16:
                    e_6 = _f.sent();
                    console.warn('Error al obtener datos de journey_diary para misión:', e_6);
                    return [3 /*break*/, 17];
                case 17:
                    // Si después de intentar con ambas tablas seguimos sin datos y tenemos un error, lo lanzamos
                    if (!entriesData && error) {
                        throw error;
                    }
                    // Si no hay datos (pero no hubo error), devolvemos un array vacío
                    if (!entriesData || entriesData.length === 0) {
                        return [2 /*return*/, []];
                    }
                    // Procesamos las entradas para asegurar el formato correcto
                    return [2 /*return*/, entriesData.map(function (entry) {
                        var _a;
                        var cityName = 'Ciudad Desconocida';
                        if ((_a = entry.cities) === null || _a === void 0 ? void 0 : _a.name) {
                            cityName = entry.cities.name;
                        }
                        else if (entry.cityName) {
                            cityName = entry.cityName;
                        }
                        else if (entry.city_name) {
                            cityName = entry.city_name;
                        }
                        else if (entry.tags && Array.isArray(entry.tags)) {
                            var cityTag = entry.tags.find(function (tag) {
                                return tag !== 'misión' && tag !== 'mission' && tag !== 'viaje' && tag !== 'travel';
                            });
                            if (cityTag) {
                                cityName = cityTag.charAt(0).toUpperCase() + cityTag.slice(1); // Capitalizar
                            }
                        }
                        return {
                            id: entry.id || "generated-".concat(Date.now(), "-").concat(Math.random().toString(36).substring(2, 9)),
                            userId: entry.userId || '',
                            cityId: entry.cityId || '',
                            missionId: entry.missionId || missionId,
                            title: entry.title || 'Entrada sin título',
                            content: entry.content || '',
                            photos: Array.isArray(entry.photos) ? entry.photos :
                                (entry.photos ? [entry.photos] : []),
                            location: entry.location || null,
                            created_at: entry.created_at || new Date().toISOString(),
                            tags: Array.isArray(entry.tags) ? entry.tags : [],
                            city_name: cityName
                        };
                    })];
                case 18:
                    error_3 = _f.sent();
                    console.error('Error obteniendo entradas de la misión:', error_3);
                    throw error_3;
                case 19: return [2 /*return*/];
            }
        });
    });
};
exports.getMissionJournalEntries = getMissionJournalEntries;
/**
 * Crea una nueva entrada en el diario
 * @param data Datos de la entrada
 * @returns La entrada creada
 */
var createJournalEntry = function (data) {
    return __awaiter(void 0, void 0, void 0, function () {
        var baseData, _a, newEntry, insertError, updateError, e_2, error_4;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 6, , 7]);
                    console.log('📝 Creando entrada de diario con datos:', data);
                    // Validar datos requeridos
                    if (!data.userId || !data.missionId) {
                        throw new Error('userId y missionId son requeridos');
                    }
                    // Preparar datos base - IMPORTANTE: usar solo las columnas de la definición de tabla
                    baseData = {
                        userid: data.userId,
                        missionid: data.missionId,
                        cityid: data.cityId === 'unknown' ? null : data.cityId,
                        title: data.title,
                        content: data.content || '',
                        photos: Array.isArray(data.photos) ? data.photos : [data.photos],
                        tags: Array.isArray(data.tags) ? data.tags : [],
                        created_at: new Date().toISOString()
                    };
                    console.log('🔄 Intentando insertar entrada con datos:', baseData);
                    return [4 /*yield*/, supabase_1.supabase
                        .from('journal_entries')
                        .insert(baseData)
                        .select()
                        .single()];
                case 1:
                    _a = _b.sent(), newEntry = _a.data, insertError = _a.error;
                    if (insertError) {
                        console.error('❌ Error al insertar entrada:', insertError);
                        throw insertError;
                    }
                    if (!newEntry) {
                        throw new Error('No se pudo crear la entrada del diario');
                    }
                    // Verificar que se guardó correctamente el missionid
                    console.log('✅ Entrada creada con ID:', newEntry.id);
                    console.log('📄 Datos de la entrada creada:', {
                        missionid: newEntry.missionid,
                        userid: newEntry.userid,
                        content: newEntry.content ? newEntry.content.substring(0, 50) + '...' : 'sin contenido'
                    });
                    if (!(!newEntry.missionid && data.missionId)) return [3 /*break*/, 5];
                    console.warn('⚠️ El missionid no se guardó correctamente. Intentando actualizar...');
                    _b.label = 2;
                case 2:
                    _b.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, supabase_1.supabase
                        .from('journal_entries')
                        .update({ missionid: data.missionId })
                        .eq('id', newEntry.id)];
                case 3:
                    updateError = (_b.sent()).error;
                    if (!updateError) {
                        console.log('✅ MissionId actualizado correctamente');
                        newEntry.missionid = data.missionId;
                    }
                    else {
                        console.error('❌ Error al actualizar missionId:', updateError);
                    }
                    return [3 /*break*/, 5];
                case 4:
                    e_2 = _b.sent();
                    console.error('❌ Error durante la actualización del missionId:', e_2);
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/, newEntry];
                case 6:
                    error_4 = _b.sent();
                    console.error('❌ Error en createJournalEntry:', error_4);
                    throw error_4;
                case 7: return [2 /*return*/];
            }
        });
    });
};
exports.createJournalEntry = createJournalEntry;
/**
 * Añade una foto a una entrada del diario existente
 * @param entryId ID de la entrada del diario
 * @param photoUrl URL de la foto a añadir
 * @returns true si la operación fue exitosa
 */
var addPhotoToEntry = function (entryId, photoUrl) {
    return __awaiter(void 0, void 0, void 0, function () {
        var _a, entry, fetchError, currentPhotos, updatedPhotos, updateError, error_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, supabase_1.supabase
                        .from('journal_entries')
                        .select('photos')
                        .eq('id', entryId)
                        .single()];
                case 1:
                    _a = _b.sent(), entry = _a.data, fetchError = _a.error;
                    if (fetchError) {
                        console.error('Error al obtener entrada del diario:', fetchError);
                        return [2 /*return*/, false];
                    }
                    currentPhotos = Array.isArray(entry.photos) ? entry.photos : [];
                    updatedPhotos = currentPhotos.concat([photoUrl]);
                    return [4 /*yield*/, supabase_1.supabase
                        .from('journal_entries')
                        .update({ photos: updatedPhotos })
                        .eq('id', entryId)];
                case 2:
                    updateError = (_b.sent()).error;
                    if (updateError) {
                        console.error('Error al actualizar fotos en la entrada:', updateError);
                        return [2 /*return*/, false];
                    }
                    return [2 /*return*/, true];
                case 3:
                    error_1 = _b.sent();
                    console.error('Error al añadir foto a la entrada:', error_1);
                    return [2 /*return*/, false];
                case 4: return [2 /*return*/];
            }
        });
    });
};
exports.addPhotoToEntry = addPhotoToEntry;
/**
 * Añade un comentario a una entrada del diario existente
 * @param entryId ID de la entrada del diario
 * @param userId ID del usuario que hace el comentario
 * @param comment Texto del comentario
 * @returns true si la operación fue exitosa
 */
var addCommentToEntry = function (entryId, userId, comment) {
    return __awaiter(void 0, void 0, void 0, function () {
        try {
            // Insertar siempre en la tabla journal_comments
            return [4 /*yield*/, supabase_1.supabase
                .from('journal_comments')
                .insert({
                    entry_id: entryId,
                    user_id: userId,
                    comment: comment,
                    created_at: new Date().toISOString()
                })];
        } catch (error) {
            console.error('Error al insertar comentario en journal_comments:', error);
            return [2 /*return*/, false];
        }
    });
};
exports.addCommentToEntry = addCommentToEntry;
/**
 * Obtiene una entrada específica del diario por su ID
 * @param entryId ID de la entrada a obtener
 * @returns La entrada del diario o null si no se encuentra
 */
var getJournalEntryById = function (entryId) {
    return __awaiter(void 0, void 0, void 0, function () {
        var _a, entry, error, cityName, _b, cityData, cityError, possibleCityTag, error_1;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 3, , 4]);
                    console.log("Obteniendo entrada del diario con ID: " + entryId);
                    return [4 /*yield*/, supabase_1.supabase
                        .from('journal_entries')
                        .select('*')
                        .eq('id', entryId)
                        .single()];
                case 1:
                    _a = _c.sent(), entry = _a.data, error = _a.error;
                    if (error) {
                        console.error('Error obteniendo entrada del diario:', error);
                        return [2 /*return*/, null];
                    }
                    if (!entry) {
                        console.log('No se encontró la entrada del diario');
                        return [2 /*return*/, null];
                    }
                    cityName = 'Ciudad Desconocida';
                    _c.label = 2;
                case 2:
                    try {
                        if (entry.cityid) {
                            return [4 /*yield*/, supabase_1.supabase
                                .from('cities')
                                .select('name')
                                .eq('id', entry.cityid)
                                .single()];
                        }
                    }
                    catch (e) {
                        console.warn('Error al obtener nombre de la ciudad:', e);
                    }
                    return [3 /*break*/, 3];
                case 3:
                    _b = _c.sent(), cityData = _b.data, cityError = _b.error;
                    if (!cityError && cityData) {
                        cityName = cityData.name;
                    }
                    if (cityName === 'Ciudad Desconocida' && entry.tags && Array.isArray(entry.tags)) {
                        possibleCityTag = entry.tags.find(function (tag) {
                            return tag !== 'misión' &&
                                tag !== 'mission' &&
                                tag !== 'viaje' &&
                                tag !== 'travel' &&
                                tag.charAt(0).toUpperCase() === tag.charAt(0);
                        });
                        if (possibleCityTag) {
                            cityName = possibleCityTag;
                        }
                    }
                    return [2 /*return*/, {
                        id: entry.id,
                        userId: entry.userid,
                        cityId: entry.cityid,
                        missionId: entry.missionid,
                        title: entry.title,
                        content: entry.content || '',
                        photos: Array.isArray(entry.photos) ? entry.photos : [],
                        location: entry.location,
                        created_at: entry.created_at,
                        tags: Array.isArray(entry.tags) ? entry.tags : [],
                        city_name: cityName
                    }];
                case 4:
                    error_1 = _c.sent();
                    console.error('Error obteniendo entrada del diario:', error_1);
                    return [2 /*return*/, null];
            }
        });
    });
};
exports.getJournalEntryById = getJournalEntryById;
// Obtener comentarios de una entrada
var getCommentsByEntryId = function (entryId) {
    return __awaiter(void 0, void 0, void 0, function () {
        var _a, data, error;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, supabase_1.supabase
                        .from('journal_comments')
                        .select('*, users: user_id (username)')
                        .eq('entry_id', entryId)
                        .order('created_at', { ascending: true })];
                case 1:
                    _a = _b.sent(), data = _a.data, error = _a.error;
                    if (error) throw error;
                    // Mapear para incluir username
                    return [2 /*return*/, (data || []).map((c) => ({
                        ...c,
                        username: c.users?.username || 'Usuario',
                    }))];
                case 2:
                    error = _b.sent();
                    console.error('Error al obtener comentarios:', error);
                    return [2 /*return*/, []];
                case 3: return [2 /*return*/];
            }
        });
    });
};
exports.getCommentsByEntryId = getCommentsByEntryId;
// Insertar comentario en la tabla
var addCommentToEntryTable = function (entryId, userId, comment) {
    return __awaiter(void 0, void 0, void 0, function () {
        var _a, error;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, supabase_1.supabase
                        .from('journal_comments')
                        .insert({ entry_id: entryId, user_id: userId, comment })];
                case 1:
                    _a = _b.sent(), error = _a.error;
                    if (error) throw error;
                    return [2 /*return*/, true];
                case 2:
                    error = _b.sent();
                    console.error('Error al insertar comentario:', error);
                    return [2 /*return*/, false];
                case 3: return [2 /*return*/];
            }
        });
    });
};
exports.addCommentToEntryTable = addCommentToEntryTable;
