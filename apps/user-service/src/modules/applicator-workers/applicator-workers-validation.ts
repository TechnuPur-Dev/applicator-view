import Joi, { Schema } from 'joi';
import {
	phoneNumberSchema,
	// passwordSchema,
	// inviteStatusSchema,
} from '../../../../../shared/utils/joi-common-validations';

const workerTypeSchema: Schema = Joi.string()
	.valid(
		'PILOT',
		'DRONE_OPERATOR',
		'FIELD_OPERATOR',
		'SCOUT',
		'MECHANIC',
		'ADVISOR',
		'COORDINATOR',
	)
	.required();

const workerCreateSchema: Schema = Joi.object({
	body: Joi.object({
		title: workerTypeSchema.required(),
		firstName: Joi.string().min(1).max(50).required(),
		lastName: Joi.string().min(1).max(50).required(),
		email: Joi.string().email().required(),
		phoneNumber: phoneNumberSchema.required(),
		// password: passwordSchema.required(), // Password with length constraints
		address1: Joi.string().max(100).required(),
		address2: Joi.string().allow('').max(100).optional(),
		stateId: Joi.number().integer().positive().required(),
		county: Joi.string().max(50).required(),
		township: Joi.string().max(50).required(),
		zipCode: Joi.string()
			.pattern(/^\d{5}(-\d{4})?$/)
			.required(),
		pilotPestLicenseNumber: Joi.string().allow('').optional(), // Nullable field
		businessLicenseNumber: Joi.string().allow('').optional(), // Nullable field
		pilotLicenseNumber: Joi.string().allow('').optional(), // Nullable field
		planeOrUnitNumber: Joi.string().allow('').optional(), // Nullable field
		dollarPerAcre: Joi.number().precision(2).min(0).optional(), // Decimal field
		percentageFee: Joi.number().precision(2).min(0).optional(), // Decimal field
		autoAcceptJobs: Joi.boolean().default(false).optional(),
		canViewPricingDetails: Joi.boolean().default(false).optional(),
		code: Joi.string().allow('').optional(),
	}).required(),
});

const paramsSchema: Schema = Joi.object({
	params: Joi.object({
		id: Joi.number().integer().positive().required(), // growerId should be a positive number
	}).required(),
});

const updateSchema: Schema = Joi.object({
	params: Joi.object({
		id: Joi.number().integer().positive().required(), // ID should be a positive number
	}).required(),
	body: Joi.object({
		firstName: Joi.string().min(1).max(50).optional(),
		lastName: Joi.string().min(1).max(50).optional(),
		email: Joi.string().email().optional(),
		phoneNumber: phoneNumberSchema.optional(),
		businessName: Joi.string().max(100).optional(),
		address1: Joi.string().max(100).optional(),
		address2: Joi.string().max(100).optional(),
		stateId: Joi.number().integer().positive().optional(),
		county: Joi.string().max(50).optional(),
		township: Joi.string().max(50).optional(),
		zipCode: Joi.string()
			.pattern(/^\d{5}(-\d{4})?$/)
			.optional(),
		pilotPestLicenseNumber: Joi.string().min(1).max(50).optional(), // Nullable field
		pilotLicenseNumber: Joi.string().min(1).max(50).optional(), // Nullable field
		businessLicenseNumber: Joi.string().min(1).max(50).optional(), // Nullable field
		planeOrUnitNumber: Joi.string().min(1).max(50).optional(), // Nullable field
		percentageFee: Joi.number().precision(2).min(0).optional(), // Decimal field
		dollarPerAcre: Joi.number().precision(2).min(0).optional(), // Decimal field
		autoAcceptJobs: Joi.boolean().default(false).optional(),
		canViewPricingDetails: Joi.boolean().default(false).optional(),
		isActive: Joi.boolean().optional(),
		code: Joi.string().optional(),
	}).required(),
});
const updateInviteStatusSchema: Schema = Joi.object({
	body: Joi.object({
		status: Joi.string().valid('ACCEPTED', 'REJECTED').required(),
		applicatorId: Joi.number().integer().positive().required(),
	}).required(),
});
const searchWorkerByEmail: Schema = Joi.object({
	params: Joi.object({
		email: Joi.string().required(),
	}).required(),
});
const sendInviteSchema: Schema = Joi.object({
	params: Joi.object({
		id: Joi.number().integer().positive().required(), // growerId should be a positive number
	}).required(),
	body: Joi.object({
		pilotPestLicenseNumber: Joi.string().min(1).max(50).optional(), // Nullable field
		pilotLicenseNumber: Joi.string().min(1).max(50).optional(), // Nullable field
		businessLicenseNumber: Joi.string().min(1).max(50).optional(), // Nullable field
		planeOrUnitNumber: Joi.string().min(1).max(50).optional(), // Nullable field
		percentageFee: Joi.number().precision(2).min(0).optional(), // Decimal field
		dollarPerAcre: Joi.number().precision(2).min(0).optional(), // Decimal field
		autoAcceptJobs: Joi.boolean().default(false).optional(),
		canViewPricingDetails: Joi.boolean().default(false).optional(),
		code: Joi.string().optional(),
	}).optional(),
});
export default {
	workerCreateSchema,
	paramsSchema,
	updateSchema,
	updateInviteStatusSchema,
	searchWorkerByEmail,
	sendInviteSchema,
};
