"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.setError = exports.setAuthState = exports.logout = exports.setToken = exports.setUser = void 0;
var toolkit_1 = require("@reduxjs/toolkit");
var initialState = {
    user: null,
    token: null,
    authState: 'unauthenticated',
    error: null
};
var authSlice = (0, toolkit_1.createSlice)({
    name: 'auth',
    initialState: initialState,
    reducers: {
        setUser: function (state, action) {
            state.user = action.payload;
            state.authState = 'authenticated';
            state.error = null;
        },
        setToken: function (state, action) {
            state.token = action.payload;
        },
        setAuthState: function (state, action) {
            state.authState = action.payload;
        },
        setError: function (state, action) {
            state.error = action.payload;
        },
        logout: function (state) {
            console.log('Ejecutando logout en authSlice');
            state.user = null;
            state.token = null;
            state.authState = 'unauthenticated';
            state.error = null;
            console.log('Estado después del logout:', state);
            return state;
        },
    },
});
exports.setUser = (_a = authSlice.actions, _a.setUser), exports.setToken = _a.setToken, exports.logout = _a.logout, exports.setAuthState = _a.setAuthState, exports.setError = _a.setError;
exports.default = authSlice.reducer;
