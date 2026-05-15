"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dateQuerySchema = void 0;
const zod_1 = require("zod");
exports.dateQuerySchema = zod_1.z.object({
    date: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
