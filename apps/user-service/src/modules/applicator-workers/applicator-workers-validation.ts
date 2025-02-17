import Joi, { Schema } from 'joi';
import { phoneNumberSchema, } from '../../../../../shared/utils/joi-common-validations';

const workerTypeSchema: Schema = 
Joi.string().valid('PILOT', 'DRONE_OPERATOR','FIELD_OPERATOR','SCOUT', 'MECHANIC','ADVISOR','COORDINATOR').required();

const workerCreateSchema: Schema = Joi.object({
	body: Joi.object({
		title: workerTypeSchema.required(),
		firstName: Joi.string().min(1).max(50).required(),
		lastName: Joi.string().min(1).max(50).required(),
		email: Joi.string().email().required(),
		phoneNumber: phoneNumberSchema.required(),
		businessName: Joi.string().max(100).optional(),
		address1: Joi.string().max(100).required(),
		address2: Joi.string().max(100).optional(),
		stateId: Joi.number().integer().positive().required(),
		county: Joi.string().max(50).required(),
		township: Joi.string().max(50).required(),
		zipCode: Joi.string()
			.pattern(/^\d{5}(-\d{4})?$/)
			.required(),
		pilotLicenseNumber: Joi.string().min(1).max(50).optional(), // Nullable field
		businessLicenseNumber: Joi.string().min(1).max(50).optional(), // Nullable field
		planeOrUnitNumber: Joi.string().min(1).max(50).optional(), // Nullable field
		perAcrePricing: Joi.number().precision(2).min(0).optional(), // Decimal field
		percentageFee: Joi.number().precision(2).min(0).optional(), // Decimal field
		dollarPerAcre: Joi.number().precision(2).min(0).optional(), // Decimal field
		autoAcceptJobs: Joi.boolean().default(false).optional(),
		canViewPricingDetails: Joi.boolean().default(false).optional(),
		code: Joi.string().optional(),
		lastLogin: Joi.date().optional(),
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
		title: workerTypeSchema.required(),
		firstName: Joi.string().min(1).max(50).required(),
		lastName: Joi.string().min(1).max(50).required(),
		email: Joi.string().email().required(),
		phoneNumber: phoneNumberSchema.required(),
		businessName: Joi.string().max(100).optional(),
		address1: Joi.string().max(100).required(),
		address2: Joi.string().max(100).optional(),
		stateId: Joi.number().integer().positive().required(),
		county: Joi.string().max(50).required(),
		township: Joi.string().max(50).required(),
		zipCode: Joi.string()
			.pattern(/^\d{5}(-\d{4})?$/)
			.required(),
		pilotLicenseNumber: Joi.string().min(1).max(50).optional(), // Nullable field
		businessLicenseNumber: Joi.string().min(1).max(50).optional(), // Nullable field
		planeOrUnitNumber: Joi.string().min(1).max(50).optional(), // Nullable field
		perAcrePricing: Joi.number().precision(2).min(0).optional(), // Decimal field
		percentageFee: Joi.number().precision(2).min(0).optional(), // Decimal field
		dollarPerAcre: Joi.number().precision(2).min(0).optional(), // Decimal field
		autoAcceptJobs: Joi.boolean().default(false).optional(),
		canViewPricingDetails: Joi.boolean().default(false).optional(),
		code: Joi.string().optional(),
		lastLogin: Joi.date().optional(),
	}).required(),
});
export default {workerCreateSchema,paramsSchema,updateSchema}