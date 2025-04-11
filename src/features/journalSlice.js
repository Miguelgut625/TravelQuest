"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.setRefreshJournal = exports.setJournalError = exports.setJournalLoading = exports.setJournalEntries = exports.setError = exports.setLoading = exports.deleteEntry = exports.updateEntry = exports.addEntry = void 0;
var toolkit_1 = require("@reduxjs/toolkit");
var initialState = {
    entries: {},
    isLoading: false,
    error: null,
    shouldRefresh: false
};
var journalSlice = (0, toolkit_1.createSlice)({
    name: 'journal',
    initialState: initialState,
    reducers: {
        addEntry: function (state, action) {
            var cityId = action.payload.cityId;
            if (!state.entries[cityId]) {
                state.entries[cityId] = [];
            }
            state.entries[cityId].push(action.payload);
        },
        updateEntry: function (state, action) {
            var _a = action.payload, cityId = _a.cityId, id = _a.id;
            var cityEntries = state.entries[cityId];
            if (cityEntries) {
                var index = cityEntries.findIndex(function (entry) { return entry.id === id; });
                if (index !== -1) {
                    cityEntries[index] = action.payload;
                }
            }
        },
        deleteEntry: function (state, action) {
            var _a = action.payload, cityId = _a.cityId, entryId = _a.entryId;
            if (state.entries[cityId]) {
                state.entries[cityId] = state.entries[cityId].filter(function (entry) { return entry.id !== entryId; });
            }
        },
        setLoading: function (state, action) {
            state.isLoading = action.payload;
        },
        setError: function (state, action) {
            state.error = action.payload;
        },
        setJournalEntries: function (state, action) {
            state.entries = action.payload;
            state.isLoading = false;
            state.error = null;
        },
        setJournalLoading: function (state, action) {
            state.isLoading = action.payload;
        },
        setJournalError: function (state, action) {
            state.error = action.payload;
            state.isLoading = false;
        },
        setRefreshJournal: function (state, action) {
            state.shouldRefresh = action.payload;
        }
    },
});
exports.addEntry = (_a = journalSlice.actions, _a.addEntry), exports.updateEntry = _a.updateEntry, exports.deleteEntry = _a.deleteEntry, exports.setLoading = _a.setLoading, exports.setError = _a.setError, exports.setJournalEntries = _a.setJournalEntries, exports.setJournalLoading = _a.setJournalLoading, exports.setJournalError = _a.setJournalError, exports.setRefreshJournal = _a.setRefreshJournal;
exports.default = journalSlice.reducer;
