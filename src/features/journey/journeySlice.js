"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.setError = exports.setLoading = exports.completeMission = exports.setMissions = void 0;
var toolkit_1 = require("@reduxjs/toolkit");
var initialState = {
    missions: [],
    loading: false,
    error: null,
};
var journeySlice = (0, toolkit_1.createSlice)({
    name: 'journey',
    initialState: initialState,
    reducers: {
        setMissions: function (state, action) {
            state.missions = action.payload;
        },
        completeMission: function (state, action) {
            var mission = state.missions.find(function (m) { return m.id === action.payload; });
            if (mission) {
                mission.completed = true;
            }
        },
        setLoading: function (state, action) {
            state.loading = action.payload;
        },
        setError: function (state, action) {
            state.error = action.payload;
        },
    },
});
exports.setMissions = (_a = journeySlice.actions, _a.setMissions), exports.completeMission = _a.completeMission, exports.setLoading = _a.setLoading, exports.setError = _a.setError;
exports.default = journeySlice.reducer;
