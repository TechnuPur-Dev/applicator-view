// import { application } from 'express';
import Joi, { Schema } from 'joi';
// import { phoneNumberSchema, } from '../../../../../shared/utils/joi-common-validations';

const jobTypeSchema: Schema = Joi.string().valid('AERIAL', 'GROUND').required();

const jobSourceSchema: Schema = Joi.string()
	.valid('APPLICATOR', 'GROWER', 'BIDDING')
	.required();

const jobStatusSchema: Schema = Joi.string()
	.valid('TO_BE_MAPPED', 'READY_TO_SPRAY', 'SPRAYED', 'INVOICED', 'PAID')
	.required();

const createJobSchema = Joi.object({
	body: Joi.object({
		title: Joi.string().min(3).max(100).required(), // Job title validation
		type: jobTypeSchema.required(), // Allowed job types (modify as needed)
		source: jobSourceSchema.required(), // Allowed job sources
		growerId: Joi.number().integer().positive().required(),
		applicatorId: Joi.number().integer().positive().optional(),
		fieldWorkerId: Joi.number().integer().positive().optional(),
		startDate: Joi.date().iso().required(), // Must be a valid date in ISO format
		endDate: Joi.date().iso().greater(Joi.ref('startDate')).required(), // Must be after startDate
		description: Joi.string().max(500).optional(),
		farmId: Joi.number().integer().positive().required(), // Farm ID must be positive
		sensitiveAreas: Joi.string().max(255).optional(),
		adjacentCrops: Joi.string().max(255).optional(),
		specialInstructions: Joi.string().max(500).optional(),
		attachments: Joi.object().optional(), // Attachments should be a valid JSON object

		// Fields array validation
		fields: Joi.array()
			.items(
				Joi.object({
					fieldId: Joi.number().integer().positive().required(),
					actualAcres: Joi.number().positive().optional(),
				}),
			)
			.optional(),

		// Products array validation
		products: Joi.array()
			.items(
				Joi.object({
					name: Joi.string().min(3).max(100).required(),
					ratePerAcre: Joi.number()
						.precision(2)
						.positive()
						.required(),
					totalAcres: Joi.number().precision(2).positive().required(),
					price: Joi.number().precision(2).positive().required(),
				}),
			)
			.optional(),

		// Application Fees array validation
		applicationFees: Joi.array()
			.items(
				Joi.object({
					description: Joi.string().max(255).required(),
					rateUoM: Joi.number().precision(2).positive().required(),
					perAcre: Joi.boolean().required(),
				}),
			)
			.optional(),
	}).required(),
});

const updateJobSchema = Joi.object({
	params: Joi.object({
		jobId: Joi.number().integer().positive(),
	}).required(),
	body: Joi.object({
		fieldWorkerId: Joi.number().integer().positive().optional(),
		status: jobStatusSchema.optional(),
	}).optional(),
});

const paramsSchema: Schema = Joi.object({
	params: Joi.object({
		// applicatorId: Joi.number().integer().positive(),
		jobId: Joi.number().integer().positive(),
	}).required(),
});

export default { createJobSchema, paramsSchema, updateJobSchema };
