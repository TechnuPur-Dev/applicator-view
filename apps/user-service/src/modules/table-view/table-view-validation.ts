import Joi, { Schema } from 'joi';
// import {
// 	phoneNumberSchema,
// 	passwordSchema,
// 	userRoleSchema,
// } from '../../../../../shared/utils/joi-common-validations',

const viewSchema: Schema = Joi.object()
	.or('params', 'body') // Only one must be provided
  .keys({
	params: Joi.object({
		viewId: Joi.number().integer().positive().required(), // growerId should be a positive number
	}),
	body: Joi.object({
		tableName: Joi.string().min(1).max(50).required(), // Table name validation
		config: Joi.object({ // Config must be an object
			columns: Joi.object({ // Columns must be an object
				growerId: Joi.boolean().optional(),
				firstName: Joi.boolean().optional(),
				lastName: Joi.boolean().optional(),
				email: Joi.boolean().optional(),
				phoneNumber: Joi.boolean().optional(),
				address: Joi.boolean().optional(),
				totalAcres: Joi.boolean().optional(),
				archived: Joi.boolean().optional(),
				inviteStatus: Joi.boolean().optional(),
				action: Joi.boolean().optional(),
			}).required(), // Ensure columns exist
		}).required(), // Ensure config exists
	}).required(),
});


const paramsSchema: Schema = Joi.object({
	params: Joi.object({
		viewId: Joi.number().integer().positive().required(), // growerId should be a positive number
	}).required(),
});

export default { viewSchema, paramsSchema };
