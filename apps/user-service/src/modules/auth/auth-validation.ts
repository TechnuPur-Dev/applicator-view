import Joi, { Schema } from 'joi';
import {
	phoneNumberSchema,
	passwordSchema,
	userRoleSchema,
} from '../../../../../shared/utils/joi-common-validations';

const registerUserSchema: Schema = Joi.object({
	body: Joi.object({
		profileImage: Joi.string().optional(), // Assuming this is a URL
		thumbnailProfileImage: Joi.string().optional(), // Assuming this is a URL
		firstName: Joi.string().min(1).max(50).required(), // First name with minimum and maximum length
		lastName: Joi.string().min(1).max(50).required(), // Last name with minimum and maximum length
		email: Joi.string().email().required(), // Valid email address
		phoneNumber: phoneNumberSchema.required(), // International phone number format
		password: passwordSchema.required(), // Password with length constraints
		role: userRoleSchema.required(), // Adjust roles as needed
		businessName: Joi.string().max(100).optional(), // Business name with a maximum length
		experience: Joi.number().min(0).max(50).optional(), // Experience in years
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

const verifyEmailSchema: Schema = Joi.object({
	body: Joi.object({
		email: Joi.string().email().required(),
	}).required(),
});

const loginSchema: Schema = Joi.object({
	body: Joi.object({
		email: Joi.string().email().required(), // Valid email address
		password: Joi.string().required(),
	}).required(),
});

export default { registerUserSchema, verifyEmailSchema, loginSchema };
