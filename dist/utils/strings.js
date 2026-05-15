"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uniqueStrings = uniqueStrings;
exports.normalizeText = normalizeText;
function uniqueStrings(values) {
    return [...new Set(values.map((value) => String(value ?? '').trim()).filter(Boolean))];
}
function normalizeText(value) {
    return value.trim();
}
