import Joi, { Schema } from 'joi';
import {
	phoneNumberSchema,
	inviteStatusSchema,
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
		address2: Joi.string().max(100).optional().allow(''), // Address line 2
		stateId: Joi.number().integer().positive().required(), // StateId
		county: Joi.string().max(50).required(), // County name
		township: Joi.string().max(50).required(), // Township name
		zipCode: Joi.string()
			.pattern(/^\d{5}(-\d{4})?$/)
			.required(), // ZIP code in standard formats
		bio: Joi.string().max(500).optional().allow(''), // Short biography
		additionalInfo: Joi.string().max(500).optional().allow(''), // Additional information as a flexible object
	}).required(),
});

const paramsSchema: Schema = Joi.object({
	params: Joi.object({
		id: Joi.number().integer().positive(),
		growerId: Joi.number().integer().positive(),
		applicatorId: Joi.number().integer().positive(),
	})
		.or('id', 'growerId', 'applicatorId') // At least one must be present
		.required(),
});
const paramsSchemaForType: Schema = Joi.object({
	// params: Joi.object({
	// 	type: Joi.string().valid('APPLICATOR', 'GROWER').required(),
	// }).required(),
	query: Joi.object({
		limit: Joi.number().integer().min(1).default(10),
		page: Joi.number().integer().min(1).default(1),
	}).optional(),
});
const verifyEmailAndSendOTPSchema: Schema = Joi.object({
	params: Joi.object({
		email: Joi.string().email().required(),
	}).required(),
});

const updateInviteStatusSchema: Schema = Joi.object({
	body: Joi.object({
		status: inviteStatusSchema.required(),
		userId: Joi.number().integer().positive().required(),
	}).required(),
});

const updateArchiveStatus: Schema = Joi.object({
	body: Joi.object({
		userId: Joi.number().integer().positive().required(),
		archiveStatus: Joi.boolean().optional(),
		canManageFarmsStauts: Joi.boolean().optional(),
	}).required(),
});

const sendInviteSchema: Schema = Joi.object({
	params: Joi.object({
		applicatorId: Joi.number().integer().positive(),
		growerId: Joi.number().integer().positive(),
		// email: Joi.string().required(),
	})
		.or('applicatorId', 'growerId') // At least one must be present
		.required(),
});

const searchApplicatorByEmail: Schema = Joi.object({
	params: Joi.object({
		email: Joi.string().required(),
	}).required(),
	query: Joi.object({
		limit: Joi.number().integer().positive().optional(),
		page: Joi.number().integer().positive().optional(),
	}).required(),
});
const verifyInviteToken: Schema = Joi.object({
	body: Joi.object({
		token: Joi.string().required(), // Assuming this is a URL
	}).required(),
});
const respondInviteToken: Schema = Joi.object({
	body: Joi.object({
		token: Joi.string().required(), // Assuming this is a URL
		status: Joi.string().valid('ACCEPTED', 'REJECTED').required(), // Assuming this is a URL
	}).required(),
});
export default {
	createGrowerSchema,
	paramsSchema,
	verifyEmailAndSendOTPSchema,
	updateArchiveStatus,
	updateInviteStatusSchema,
	sendInviteSchema,
	searchApplicatorByEmail,
	paramsSchemaForType,
	verifyInviteToken,
	respondInviteToken,
};
