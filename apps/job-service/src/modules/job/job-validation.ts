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
		// Job details
		source: jobSourceSchema.required(),
		title: Joi.string().min(3).max(100).required(),
		type: jobTypeSchema.required(),
		growerId: Joi.number().integer().positive().required(),
		applicatorId: Joi.number().integer().positive().allow(null).optional(),
		fieldWorkerId: Joi.number().integer().positive().allow(null).optional(),

		// Date validation
		startDate: Joi.date().iso().required(),
		endDate: Joi.date().iso().greater(Joi.ref('startDate')).required(),

		// Optional description & instructions
		description: Joi.string().max(500).allow('').optional(),
		specialInstructions: Joi.string().max(500).allow('').optional(),

		// Farm & Field Information
		farmId: Joi.number().integer().positive().required(),
		sensitiveAreas: Joi.string().max(255).allow('').optional(),
		adjacentCrops: Joi.string().max(255).allow('').optional(),

		// Attachments validation (assuming it stores file details)
		attachments: Joi.array()
			.items(
				Joi.object({
					url: Joi.string().uri().required(), // Ensure valid URL
					name: Joi.string().max(255).required(),
				}),
			)
			.default([]), // Default to empty array if not provided

		// Fields array validation
		fields: Joi.array()
			.items(
				Joi.object({
					fieldId: Joi.number().integer().positive().required(),
					actualAcres: Joi.number().positive().optional(),
				}),
			)
			.default([]),

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
			.default([]),

		// Application Fees array validation
		applicationFees: Joi.array()
			.items(
				Joi.object({
					description: Joi.string().max(255).required(),
					rateUoM: Joi.number().precision(2).positive().required(),
					perAcre: Joi.boolean().required(),
				}),
			)
			.default([]),
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
