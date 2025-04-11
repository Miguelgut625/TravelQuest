"use strict";
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
exports.completeMission = exports.deductPointsFromUser = exports.addPointsToUser = exports.getUserPoints = void 0;
var supabase_1 = require("./supabase");
var journalService_1 = require("./journalService");
var getUserPoints = function (userId) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, data, error, error_1;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                return [4 /*yield*/, supabase_1.supabase
                        .from('users')
                        .select('points')
                        .eq('id', userId)
                        .maybeSingle()];
            case 1:
                _a = _b.sent(), data = _a.data, error = _a.error;
                if (error)
                    throw error;
                return [2 /*return*/, (data === null || data === void 0 ? void 0 : data.points) || 0];
            case 2:
                error_1 = _b.sent();
                console.error('Error obteniendo puntos del usuario:', error_1);
                return [2 /*return*/, 0]; // Retornamos 0 en caso de error
            case 3: return [2 /*return*/];
        }
    });
}); };
exports.getUserPoints = getUserPoints;
var addPointsToUser = function (userId, points) { return __awaiter(void 0, void 0, void 0, function () {
    var currentPoints, error, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                return [4 /*yield*/, (0, exports.getUserPoints)(userId)];
            case 1:
                currentPoints = _a.sent();
                return [4 /*yield*/, supabase_1.supabase
                        .from('users')
                        .update({
                        points: currentPoints + points,
                        updated_at: new Date().toISOString()
                    })
                        .eq('id', userId)];
            case 2:
                error = (_a.sent()).error;
                if (error)
                    throw error;
                return [2 /*return*/, currentPoints + points];
            case 3:
                error_2 = _a.sent();
                console.error('Error añadiendo puntos al usuario:', error_2);
                throw error_2;
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.addPointsToUser = addPointsToUser;
var deductPointsFromUser = function (userId, points) { return __awaiter(void 0, void 0, void 0, function () {
    var currentPoints, error, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                return [4 /*yield*/, (0, exports.getUserPoints)(userId)];
            case 1:
                currentPoints = _a.sent();
                // Verificamos que el usuario tenga suficientes puntos
                if (currentPoints < points) {
                    throw new Error('No hay suficientes puntos para realizar esta acción');
                }
                return [4 /*yield*/, supabase_1.supabase
                        .from('users')
                        .update({
                        points: currentPoints - points,
                        updated_at: new Date().toISOString()
                    })
                        .eq('id', userId)];
            case 2:
                error = (_a.sent()).error;
                if (error)
                    throw error;
                return [2 /*return*/, currentPoints - points];
            case 3:
                error_3 = _a.sent();
                console.error('Error descontando puntos del usuario:', error_3);
                throw error_3;
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.deductPointsFromUser = deductPointsFromUser;
var completeMission = function (missionId, userId, imageUrl) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, missionData, missionError, updateData, error, error2, error_4, error, points, _b, journeyData, journeyError, error_5, error_6;
    var _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                console.log('Iniciando completeMission con parámetros:', { missionId: missionId, userId: userId, imageUrl: imageUrl });
                _d.label = 1;
            case 1:
                _d.trys.push([1, 18, , 19]);
                // Verificar que tenemos los datos necesarios
                if (!missionId || !userId) {
                    console.error('Parámetros inválidos:', { missionId: missionId, userId: userId });
                    throw new Error('Parámetros inválidos para completar misión');
                }
                // Obtener datos de la misión para asignar puntos
                console.log('Obteniendo datos de la misión...');
                return [4 /*yield*/, supabase_1.supabase
                        .from('journeys_missions')
                        .select("\n                id,\n                journeyId,\n                challengeId,\n                completed,\n                challenges (\n                    id,\n                    title,\n                    points\n                )\n            ")
                        .eq('id', missionId)
                        .single()];
            case 2:
                _a = _d.sent(), missionData = _a.data, missionError = _a.error;
                if (missionError || !missionData) {
                    console.error('Error al obtener datos de la misión:', missionError);
                    throw missionError || new Error('No se encontró la misión');
                }
                console.log('Datos de misión obtenidos:', missionData);
                // Verificar que la misión no esté ya completada
                if (missionData.completed) {
                    console.warn('La misión ya está completada');
                    return [2 /*return*/, missionData.challenges.points];
                }
                // Marcar la misión como completada
                console.log('Marcando misión como completada...');
                updateData = {
                    completed: true,
                    completed_at: new Date().toISOString()
                };
                if (!imageUrl) return [3 /*break*/, 9];
                console.log('Añadiendo URL de imagen a picture_url:', imageUrl);
                _d.label = 3;
            case 3:
                _d.trys.push([3, 7, , 8]);
                // Usar directamente picture_url
                updateData.picture_url = imageUrl;
                return [4 /*yield*/, supabase_1.supabase
                        .from('journeys_missions')
                        .update(updateData)
                        .eq('id', missionId)];
            case 4:
                error = (_d.sent()).error;
                if (!error) return [3 /*break*/, 6];
                console.error('Error al actualizar con picture_url:', error.message);
                // Si falla, actualizar sin la imagen
                delete updateData.picture_url;
                return [4 /*yield*/, supabase_1.supabase
                        .from('journeys_missions')
                        .update({ completed: true, completed_at: new Date().toISOString() })
                        .eq('id', missionId)];
            case 5:
                error2 = (_d.sent()).error;
                if (error2)
                    throw error2;
                _d.label = 6;
            case 6: return [3 /*break*/, 8];
            case 7:
                error_4 = _d.sent();
                console.warn('Error con la columna de imagen pero continuando:', error_4.message);
                return [3 /*break*/, 8];
            case 8: return [3 /*break*/, 11];
            case 9:
                // Si no hay imagen, solo actualizar el estado completado
                console.log('Actualizando sin imagen...');
                return [4 /*yield*/, supabase_1.supabase
                        .from('journeys_missions')
                        .update({ completed: true, completed_at: new Date().toISOString() })
                        .eq('id', missionId)];
            case 10:
                error = (_d.sent()).error;
                if (error)
                    throw error;
                _d.label = 11;
            case 11:
                points = missionData.challenges.points;
                console.log('Añadiendo puntos al usuario:', points);
                return [4 /*yield*/, (0, exports.addPointsToUser)(userId, points)];
            case 12:
                _d.sent();
                if (!imageUrl) return [3 /*break*/, 17];
                _d.label = 13;
            case 13:
                _d.trys.push([13, 16, , 17]);
                console.log('Creando entrada en el diario...');
                return [4 /*yield*/, supabase_1.supabase
                        .from('journeys')
                        .select("\n                        id,\n                        cityId,\n                        cities (name)\n                    ")
                        .eq('id', missionData.journeyId)
                        .single()];
            case 14:
                _b = _d.sent(), journeyData = _b.data, journeyError = _b.error;
                if (journeyError) {
                    console.warn('Error obteniendo datos de journey:', journeyError);
                    return [2 /*return*/, points]; // Retornamos puntos y no creamos entrada en el diario
                }
                // Crear entrada en el diario
                console.log('Datos de journey obtenidos, creando entrada de diario:', journeyData);
                return [4 /*yield*/, (0, journalService_1.createJournalEntry)({
                        userId: userId,
                        cityId: journeyData.cityId,
                        missionId: missionId,
                        title: "Misi\u00F3n completada: ".concat(missionData.challenges.title),
                        content: "He completado esta misi\u00F3n en ".concat(((_c = journeyData.cities) === null || _c === void 0 ? void 0 : _c.name) || 'mi viaje', "."),
                        photos: [imageUrl]
                    })];
            case 15:
                _d.sent();
                console.log('Entrada de diario creada exitosamente');
                return [3 /*break*/, 17];
            case 16:
                error_5 = _d.sent();
                console.warn('Error creando entrada en el diario, pero la misión se completó:', error_5);
                return [3 /*break*/, 17];
            case 17:
                console.log('Misión completada exitosamente, retornando puntos:', points);
                return [2 /*return*/, points];
            case 18:
                error_6 = _d.sent();
                console.error('Error en completeMission:', error_6);
                throw error_6;
            case 19: return [2 /*return*/];
        }
    });
}); };
exports.completeMission = completeMission;
