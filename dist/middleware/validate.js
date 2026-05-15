"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = validate;
const zod_1 = require("zod");
const errors_1 = require("../lib/errors");
function validate(schemas) {
    return (request, _response, next) => {
        try {
            if (schemas.body) {
                request.body = schemas.body.parse(request.body);
            }
            if (schemas.params) {
                request.params = schemas.params.parse(request.params);
            }
            if (schemas.query) {
                request.query = schemas.query.parse(request.query);
            }
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                next(new errors_1.AppError('Validation failed', 400, 'VALIDATION_ERROR', error.flatten(), true));
                return;
            }
            next(error);
        }
    };
}
