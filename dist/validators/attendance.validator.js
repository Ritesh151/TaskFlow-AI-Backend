"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calendarQuerySchema = exports.breakActionSchema = void 0;
const zod_1 = require("zod");
exports.breakActionSchema = zod_1.z.object({
    type: zod_1.z.enum(['lunch', 'tea', 'idle', 'custom']).optional().default('custom'),
});
exports.calendarQuerySchema = zod_1.z.object({
    months: zod_1.z.coerce.number().int().min(1).max(6).optional(),
});
