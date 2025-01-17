import httpStatus from 'http-status';
import { Request, Response, NextFunction } from 'express';
import ApiError from '../utils/api-error';
import { pickBy } from 'lodash';
import { Schema } from 'joi'; // Assuming you are using Joi for schema validation.

const validateSchema =
	(schema: Schema) =>
	(req: Request, res: Response, next: NextFunction): void => {
		if (!schema) {
			throw new Error('Validation schema is not provided');
		}

		const { query, body, params } = req;

		// Convert 'null' string to actual null in the query object
		Object.keys(query || {}).forEach((key) => {
			if (query[key as keyof typeof query] === 'null') {
				(query as Record<string, unknown>)[key] = null;
			}
		});

		const object = pickBy(
			{ query, body, params },
			(x) => x && Object.keys(x).length !== 0,
		);

		const result = schema.validate(object, {
			abortEarly: true,
			errors: {
				wrap: {
					label: false,
				},
			},
		});

		if (result.error) {
			const errorMessage = result.error.details
				.map((details) => details.message)
				.join(', ');

			return next(new ApiError(httpStatus.BAD_REQUEST, errorMessage));
		}

		req.body = result.value?.body || {};
		req.query = result.value?.query || {};
		req.params = result.value?.params || {};

		return next();
	};

export default validateSchema;
