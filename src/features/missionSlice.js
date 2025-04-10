"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.setError = exports.setLoading = exports.completeMission = exports.addActiveMission = exports.setMissions = void 0;
var toolkit_1 = require("@reduxjs/toolkit");
var initialState = {
    missions: [],
    activeMissions: [],
    completedMissions: [],
    isLoading: false,
    error: null,
};
var missionSlice = (0, toolkit_1.createSlice)({
    name: 'missions',
    initialState: initialState,
    reducers: {
        setMissions: function (state, action) {
            state.missions = action.payload;
        },
        addActiveMission: function (state, action) {
            state.activeMissions.push(action.payload);
        },
        completeMission: function (state, action) {
            var mission = state.activeMissions.find(function (m) { return m.id === action.payload; });
            if (mission) {
                mission.completed = true;
                state.completedMissions.push(mission);
                state.activeMissions = state.activeMissions.filter(function (m) { return m.id !== action.payload; });
            }
        },
        setLoading: function (state, action) {
            state.isLoading = action.payload;
        },
        setError: function (state, action) {
            state.error = action.payload;
        },
    },
});
exports.setMissions = (_a = missionSlice.actions, _a.setMissions), exports.addActiveMission = _a.addActiveMission, exports.completeMission = _a.completeMission, exports.setLoading = _a.setLoading, exports.setError = _a.setError;
exports.default = missionSlice.reducer;
