import Joi, { Schema } from 'joi';
import {
	phoneNumberSchema,
	inviteStatusSchema,
	userRoleSchema
} from '../../../../../shared/utils/joi-common-validations';

const createGrowerSchema: Schema = Joi.object({
	body: Joi.object({
		profileImage: Joi.string().optional(), // Assuming this is a URL
		thumbnailProfileImage: Joi.string().optional(), // Assuming this is a URL
		firstName: Joi.string().min(1).max(50).required(), // First name with minimum and maximum length
		lastName: Joi.string().min(1).max(50).required(), // Last name with minimum and maximum length
		email: Joi.string().email().required(), // Valid email address
		phoneNumber: phoneNumberSchema.required(), // International phone number format
		address1: Joi.string().max(100).required(), // Address line 1
		address2: Joi.string().max(100).optional(), // Address line 2
		state: Joi.string().max(50).required(), // State name
		county: Joi.string().max(50).required(), // County name
		township: Joi.string().max(50).required(), // Township name
		zipCode: Joi.string()
			.pattern(/^\d{5}(-\d{4})?$/)
			.required(), // ZIP code in standard formats
		bio: Joi.string().max(500).optional(), // Short biography
		additionalInfo: Joi.string().max(500).optional(), // Additional information as a flexible object
	}).required(),
});

const paramsSchema: Schema = Joi.object({
	params: Joi.object({
		id: Joi.number().integer().positive(),
		growerId: Joi.number().integer().positive(),
	})
		.or('id', 'growerId') // At least one must be present
		.required(),
});

const verifyEmailAndSendOTPSchema: Schema = Joi.object({
	params: Joi.object({
		email: Joi.string().email().required(),
	}).required(),
});

const updateInviteStatus: Schema = Joi.object({
	body: Joi.object({
		status: inviteStatusSchema.required(),
		applicatorId: Joi.number().integer().positive().required(),
		growerId: Joi.number().integer().positive().required(),
	}).required(),
});

const updateArchiveStatus: Schema = Joi.object({
	body: Joi.object({
		userId:Joi.number().integer().positive().required(),
		role: userRoleSchema.required(),
		archiveStatus: Joi.boolean().optional(),
		canManageFarmsStauts: Joi.boolean().optional(),
	}).required(),
});
export default {
	createGrowerSchema,
	paramsSchema,
	verifyEmailAndSendOTPSchema,
	updateInviteStatus,
	updateArchiveStatus
};
