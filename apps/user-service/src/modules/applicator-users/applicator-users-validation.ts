import Joi, { Schema } from 'joi';
import {
	phoneNumberSchema,
	passwordSchema,
	// inviteStatusSchema,
} from '../../../../../shared/utils/joi-common-validations';

const userCreateSchema: Schema = Joi.object({
	body: Joi.object({
		firstName: Joi.string().min(1).max(50).required(),
		lastName: Joi.string().min(1).max(50).required(),
		email: Joi.string().email().required(),
		phoneNumber: phoneNumberSchema.required(),
		password: passwordSchema.required(), // Password with length constraints
		address1: Joi.string().max(100).required(),
		address2: Joi.string().allow('').max(100).optional(),
		stateId: Joi.number().integer().positive().required(),
		county: Joi.string().max(50).required(),
		township: Joi.string().max(50).required(),
		zipCode: Joi.string()
			.pattern(/^\d{5}(-\d{4})?$/)
			.required(),
		userPermission: Joi.array()
			.items(
				Joi.object({
					permissionId: Joi.number().integer().positive().required(),
					canView: Joi.boolean().default(false).optional(),
					canEdit: Joi.boolean().default(false).optional(),
				}),
			)
			.default([]),
	}).required(),
});

const paramsSchema: Schema = Joi.object({
	params: Joi.object({
		id: Joi.number().integer().positive().required(), // growerId should be a positive number
	}).required(),
});

const searchApplicatorUserByEmail: Schema = Joi.object({
	params: Joi.object({
		email: Joi.string().required(),
	}).required(),
});

const sendInviteSchema: Schema = Joi.object({
	body: Joi.object({
		userId: Joi.number().integer().positive().required(),
		userPermission: Joi.array()
			.items(
				Joi.object({
					permissionId: Joi.number().integer().positive().required(),
					canView: Joi.boolean().default(false).optional(),
					canEdit: Joi.boolean().default(false).optional(),
				}),
			)
			.default([]),
	}).optional(),
});
export default {
	searchApplicatorUserByEmail,
	userCreateSchema,
	paramsSchema,
	sendInviteSchema,
};
