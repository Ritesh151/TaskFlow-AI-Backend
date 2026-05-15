import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors';

type SchemaBag = {
  body?: ZodTypeAny;
  params?: ZodTypeAny;
  query?: ZodTypeAny;
};

export function validate(schemas: SchemaBag) {
  return (request: Request, _response: Response, next: NextFunction) => {
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
    } catch (error) {
      if (error instanceof ZodError) {
        next(new AppError('Validation failed', 400, 'VALIDATION_ERROR', error.flatten(), true));
        return;
      }
      next(error);
    }
  };
}
