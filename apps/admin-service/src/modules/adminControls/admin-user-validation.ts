import Joi, { Schema } from 'joi';
import { phoneNumberSchema,passwordSchema } from '../../../../../shared/utils/joi-common-validations';
const accessLevelSchema: Schema = Joi.string()
	.valid('read', 'write')
	.required();
const createData: Schema = Joi.object({
	body: Joi.object({
		firstName: Joi.string().min(1).max(50).required(), // First name with minimum and maximum length
		lastName: Joi.string().min(1).max(50).required(), // Last name with minimum and maximum length
		email: Joi.string().email().required(), // Valid email address
		password: passwordSchema.required(), // Password with length constraints
		phoneNumber: phoneNumberSchema.required(), // International phone number format
		address1: Joi.string().max(100).required(), // Address line 1
		address2: Joi.string().max(100).optional().allow(''), // Address line 2
		stateId: Joi.number().integer().positive().required(), // StateId
		county: Joi.string().max(50).required(), // County name
		township: Joi.string().max(50).required(), // Township name
		zipCode: Joi.string()
			.pattern(/^\d{5}(-\d{4})?$/)
			.required(), // ZIP code in standard formats
		bio: Joi.string().max(500).optional().allow(''), // Short biography
		additionalInfo: Joi.string().max(500).optional().allow(''), // Additional information as a flexible object
	    permissions: Joi.array()
					.items(
						Joi.object({
							permissionId: Joi.number().integer().positive().required(),
							accessLevel: accessLevelSchema.required(),
						}),
					)
					.default([]),
	}).required(),
});
const paramsSchema: Schema = Joi.object({
	params: Joi.object({
		userId: Joi.number().integer().positive(),
	})
		// .or('id', 'growerId', 'applicatorId') // At least one must be present
		.required(),
});
const updateStatus: Schema = Joi.object({
	body: Joi.object({
		userId: Joi.number().integer().positive(),
		status: Joi.boolean().required(),
	})
		// .or('id', 'growerId', 'applicatorId') // At least one must be present
		.required(),
});
const loginSchema: Schema = Joi.object({
	body: Joi.object({
		email: Joi.string().email().required(), // Valid email address
		password: Joi.string().required(),
		deviceToken: Joi.string().optional(),
	}).required(),
});
export default {
	paramsSchema,
	createData,
	updateStatus,
	loginSchema
};
