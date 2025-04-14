import Joi, { Schema } from 'joi';
import {
	phoneNumberSchema,
	passwordSchema,
	userRoleSchema,
	otpSchema,
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
		address2: Joi.string().max(100).optional().allow(''), // Address line 2
		stateId: Joi.number().integer().positive().required(), // State name
		county: Joi.string().max(50).required(), // County name
		township: Joi.string().max(50).required(), // Township name
		zipCode: Joi.string()
			.pattern(/^\d{5}(-\d{4})?$/)
			.required(), // ZIP code in standard formats
		bio: Joi.string().max(500).optional().allow(''), // Short biography
		additionalInfo: Joi.string().max(500).optional().allow(''), // Additional information as a flexible object
	}).required(),
});

const verifyEmailAndSendOTPSchema: Schema = Joi.object({
	body: Joi.object({
		email: Joi.string().email().required(),
	}).required(),
});

const verifyOTPAndRegisterEmailSchema = Joi.object({
	body: Joi.object({
		email: Joi.string().email().required(),
		otp: otpSchema.required(),
		role: userRoleSchema.required(),
	}).required(),
});

const loginSchema: Schema = Joi.object({
	body: Joi.object({
		email: Joi.string().email().required(), // Valid email address
		password: Joi.string().required(),
		deviceToken: Joi.string().optional(),
		role: userRoleSchema.required(),
	}).required(),
});

const acceptInviteAndSignUp: Schema = Joi.object({
	body: Joi.object({
		token: Joi.string().required(), // Assuming this is a URL
		profileImage: Joi.string().optional(), // Assuming this is a URL
		thumbnailProfileImage: Joi.string().optional(), // Assuming this is a URL
		firstName: Joi.string().min(1).max(50).required(), // First name with minimum and maximum length
		lastName: Joi.string().min(1).max(50).required(), // Last name with minimum and maximum length
		email: Joi.string().email().required(), // Valid email address
		phoneNumber: phoneNumberSchema.required(), // International phone number format
		password: passwordSchema.required(), // Password with length constraints
		businessName: Joi.string().max(100).optional(), // Business name with a maximum length
		experience: Joi.number().min(0).max(50).optional(), // Experience in years
		address1: Joi.string().max(100).required(), // Address line 1
		address2: Joi.string().max(100).optional().allow(''), // Address line 2
		stateId: Joi.number().integer().positive().required(), // State name
		county: Joi.string().max(50).required(), // County name
		township: Joi.string().max(50).required(), // Township name
		zipCode: Joi.string()
			.pattern(/^\d{5}(-\d{4})?$/)
			.required(), // ZIP code in standard formats
		bio: Joi.string().max(500).optional().allow(''), // Short biography
		additionalInfo: Joi.string().max(500).optional().allow(''), // Additional information as a flexible object
		// Pilot Specific Information

		pilotPestLicenseNumber: Joi.string().min(1).max(50).optional(), // Nullable field
		pilotLicenseNumber: Joi.string().min(1).max(50).optional(), // Nullable field
		businessLicenseNumber: Joi.string().min(1).max(50).optional(), // Nullable field
		planeOrUnitNumber: Joi.string().min(1).max(50).optional(), // Nullable field
		// percentageFee: Joi.number().precision(2).min(0).optional(), // Decimal field
		// dollarPerAcre: Joi.number().precision(2).min(0).optional(), // Decimal field
		// autoAcceptJobs: Joi.boolean().default(false).optional(),
		// canViewPricingDetails: Joi.boolean().default(false).optional(),
		// code: Joi.string().optional(),
		// To Mange Farm Permissions
		canManageFarms: Joi.boolean().optional(), // Optional, only sent when grower responds
		farmPermissions: Joi.array()
			.items(
				Joi.object({
					farmId: Joi.number().required(),
					canView: Joi.boolean().required(),
					canEdit: Joi.boolean().required(),
				}),
			)
			.min(0), // Allows empty array
	}).required(),
});

export default {
	registerUserSchema,
	verifyEmailAndSendOTPSchema,
	verifyOTPAndRegisterEmailSchema,
	loginSchema,
	acceptInviteAndSignUp,
};
