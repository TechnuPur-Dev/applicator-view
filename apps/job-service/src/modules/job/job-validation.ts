// import { application } from 'express';
import Joi, { Schema } from 'joi';
// import { phoneNumberSchema, } from '../../../../../shared/utils/joi-common-validations';

const jobTypeSchema: Schema = Joi.string().valid('AERIAL', 'GROUND').required();

// const jobSourceSchema: Schema = Joi.string()
// 	.valid('APPLICATOR', 'GROWER', 'BIDDING')
// 	.required();

const jobStatusSchema: Schema = Joi.string()
	.valid(
		'TO_BE_MAPPED',
		'READY_TO_SPRAY',
		'SPRAYED',
		'INVOICED',
		'PAID',
		'PENDING',
		'REJECTED',
		'OPEN_FOR_BIDDING',
		'ASSIGNED_TO_PILOT',
		'PILOT_REJECTED',
		'IN_PROGRESS',
	)
	.required();

const bidStatusSchema: Schema = Joi.string()
	.valid('PENDING', 'ACCEPTED')
	.required();
const createJobSchema = Joi.object({
	body: Joi.object({
		// Job details
		title: Joi.string().min(3).max(100).required(),
		type: jobTypeSchema.required(),
		userId: Joi.number().integer().positive().optional(),

		// Date validation
		startDate: Joi.date().iso().required(),
		endDate: Joi.date().iso().min(Joi.ref('startDate')).required(),
		// endDate: Joi.date().iso().greater(Joi.ref('startDate')).required(),

		// Optional description & instructions
		description: Joi.string().max(500).allow('').optional(),
		specialInstructions: Joi.string().max(500).allow('').optional(),

		// Farm & Field Information
		farmId: Joi.number().integer().positive().required(),
		sensitiveAreas: Joi.string().max(255).allow('').optional(),
		adjacentCrops: Joi.string().max(255).allow('').optional(),

		// Attachments validation (assuming it stores file details)
		attachments: Joi.array().default([]), // Default to empty array if not provided

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
					productName: Joi.string().min(1).max(50).optional(),
					productId: Joi.number().integer().positive().optional(),
					perAcreRate: Joi.number()
						.precision(2)
						.positive()
						.optional(),
					totalAcres: Joi.number().precision(2).positive().required(),
					price: Joi.number().precision(2).positive().optional(),
				}),
			)
			.default([]),

		// Application Fees array validation
		applicationFees: Joi.array()
			.items(
				Joi.object({
					description: Joi.string().max(255).optional(),
					rateUoM: Joi.number().precision(2).positive().required(),
					perAcre: Joi.boolean().required(),
				}),
			)
			.default([]),
	}).required(),
});

const updateJobSchema = Joi.object({
	params: Joi.object({
		jobId: Joi.number().integer().positive().required(),
	}).required(),
	body: Joi.alternatives()
		.try(
			Joi.object({
				fieldWorkerId: Joi.number().integer().positive().required(),
			}),
			Joi.object({ status: jobStatusSchema.required() }),
		)
		.required(),
});
const inviteTokenSchema: Schema = Joi.object({
	params: Joi.object({
		token: Joi.string().required(),
	}).required(),
});
const paramsSchema: Schema = Joi.object({
	params: Joi.object({
		jobId: Joi.number().integer().positive(),
	}).required(),
});

const jobSourceParamSchema: Schema = Joi.object({
	params: Joi.object({
		type: Joi.string()
			.valid('APPLICATOR', 'GROWER', 'BIDDING', 'ALL')
			.required(),
	}).required(),
	query: Joi.object({
		limit: Joi.number().integer().min(1).default(10),
		page: Joi.number().integer().min(1).default(1),
		label: Joi.string().min(1).max(50).optional().allow(''),
		searchValue: Joi.string().min(1).max(50).optional().allow(''),
	}).optional(),
});

const jobStatusParamSchema: Schema = Joi.object({
	params: Joi.object({
		jobId: Joi.number().integer().positive().required(),
	}).required(),
	body: Joi.object({
		status: Joi.string()
			.valid(
				'READY_TO_SPRAY',
				'IN_PROGRESS',
				'PILOT_REJECTED',
				'REJECTED',
			)
			.required(),
		rejectionReason: Joi.string()
			.min(1)
			.max(300)
			.when('status', {
				is: Joi.valid('REJECTED', 'PILOT_REJECTED'),
				then: Joi.required(),
				otherwise: Joi.forbidden(),
			}),
	}).required(),
});

const pilotJobsParamSchema: Schema = Joi.object({
	params: Joi.object({
		pilotId: Joi.number().integer().positive().required(),
	}).required(),
	query: Joi.object({
		limit: Joi.number().integer().min(1).default(10).allow(''),
		page: Joi.number().integer().min(1).default(1).allow(''),
	}).optional(),
});
const monthParamsSchema: Schema = Joi.object({
	query: Joi.object({
		month: Joi.string().max(500).optional().allow(''),
	}).optional(),
});
const headerStatsSchema: Schema = Joi.object({
	query: Joi.object({
		type: Joi.string()
			.valid('dashboard', 'myJobs', 'openJobs', 'pendingJobApprovals')
			.required(),
		startDate: Joi.date().iso().required(),
		endDate: Joi.date()
			.iso()
			.min(Joi.ref('startDate'))
			.optional()
			.allow(null),
	}).required(),
});
const placeBidJobSchema = Joi.object({
	body: Joi.object({
		// Job ID validation
		jobId: Joi.number().integer().positive().required(),

		// Products array validation
		products: Joi.array()
			.items(
				Joi.object({
					productId: Joi.number().integer().positive().required(),
					bidRateAcre: Joi.number()
						.precision(2)
						.positive()
						.required(),
					bidPrice: Joi.number().precision(2).positive().required(),
				}),
			)
			.default([]), // Default empty array if no products are given

		// Application Fees array validation
		applicationFees: Joi.array()
			.items(
				Joi.object({
					feeId: Joi.number().integer().positive().required(),
					bidAmount: Joi.number().precision(2).positive().required(),
				}),
			)
			.default([]), // Default empty array if no fees are given
		description: Joi.string().max(300).optional(),
	}).required(),
});
const updateBidStatusSchema = Joi.object({
	params: Joi.object({
		bidId: Joi.number().integer().positive().required(),
	}).required(),
	body: Joi.alternatives()
		.try(Joi.object({ status: bidStatusSchema.required() }))
		.required(),
});
const acceptJobSchema = Joi.object({
	params: Joi.object({
		token: Joi.string().required(),
	}).required(),
	body: Joi.object({
		status: Joi.string().valid('ACCEPT', 'REJECT').required(),
		rejectionReason: Joi.string()
			.min(1)
			.max(300)
			.when('status', {
				is: Joi.valid('REJECT'),
				then: Joi.required(),
				otherwise: Joi.forbidden(),
			}),
	}).required(),
});
const calendarApplicationsSchema: Schema = Joi.object({
	query: Joi.object({
		month: Joi.string()
			.pattern(/^\d{4}-(0[1-9]|1[0-2])$/)
			.required()
			.messages({
				'string.empty': 'month is required.',
				'string.pattern.base': 'month must be in YYYY-MM format.',
			}),
	}).optional(),
});
const upcomingApplicationsRangeSchema = Joi.object({
	query: Joi.object({
		startDate: Joi.string()
			.isoDate()
			.required()
			.label('startDate')
			.messages({
				'any.required': 'Start date is required.',
				'string.isoDate':
					'Start date must be a valid ISO date (YYYY-MM-DD).',
			}),

		endDate: Joi.string().isoDate().required().label('endDate').messages({
			'any.required': 'End date is required.',
			'string.isoDate': 'End date must be a valid ISO date (YYYY-MM-DD).',
		}),
	}).required(),
});
const autoAcceptJobSchema: Schema = Joi.object({
	params: Joi.object({
		userId:Joi.number().integer().positive().required(),
	}),
	body: Joi.object({
      status: Joi.boolean().required(),
	}).required()
});
export default {
	createJobSchema,
	paramsSchema,
	updateJobSchema,
	jobSourceParamSchema,
	jobStatusParamSchema,
	pilotJobsParamSchema,
	monthParamsSchema,
	headerStatsSchema,
	placeBidJobSchema,
	updateBidStatusSchema,
	acceptJobSchema,
	inviteTokenSchema,
	calendarApplicationsSchema,
	upcomingApplicationsRangeSchema,
	autoAcceptJobSchema
};
