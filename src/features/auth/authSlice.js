"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.setError = exports.setAuthState = exports.setUser = void 0;
var toolkit_1 = require("@reduxjs/toolkit");
var initialState = {
    user: null,
    authState: 'idle',
    error: null,
};
var authSlice = (0, toolkit_1.createSlice)({
    name: 'auth',
    initialState: initialState,
    reducers: {
        setUser: function (state, action) {
            state.user = action.payload;
            state.authState = action.payload ? 'authenticated' : 'unauthenticated';
        },
        setAuthState: function (state, action) {
            state.authState = action.payload;
        },
        setError: function (state, action) {
            state.error = action.payload;
        },
    },
});
exports.setUser = (_a = authSlice.actions, _a.setUser), exports.setAuthState = _a.setAuthState, exports.setError = _a.setError;
exports.default = authSlice.reducer;
