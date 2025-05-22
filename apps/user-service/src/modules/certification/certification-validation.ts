import Joi, { Schema } from 'joi';

const viewSchema: Schema = Joi.object()
	.or('params', 'body') // Only one must be provided
	.keys({
		params: Joi.object({
			viewId: Joi.number().integer().positive().required(),
		}),
		body: Joi.object({
			tableName: Joi.string().min(1).max(50).required(),
			viewName: Joi.string().min(1).max(30).required(),
			config: Joi.object()
				.pattern(
					Joi.string(),
					Joi.object({
						name: Joi.string().required(),
						status: Joi.boolean().required(),
					}),
				)
				.required(), // Allows any key-value pairs in the config
		}).required(),
	});

const paramsSchema: Schema = Joi.object({
	params: Joi.object({
		viewId: Joi.number().integer().positive().required(), // growerId should be a positive number
	}).required(),
});

export default { viewSchema, paramsSchema };
