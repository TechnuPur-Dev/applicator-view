import Joi, { Schema } from 'joi';

const permissionTypeSchema = Joi.string()
	.valid(
		// Dashboard
		"DASHBOARD",

		// Jobs
		"JOBS",
		"MY_JOBS",
		"BIDDING_JOBS",
		"PENDING_APPROVALS",
		"REJECTED_JOBS",
	  
		// Growers
		"GROWERS",
		"MY_GROWERS",
		"PENDING_INVITES",
	  
		// Equipment
		"EQUIPMENT",
		"WARRANTY_REGISTRATION",
		"SUPPORT_TICKETS",
		"FORUM",
	  
		// Reports
		"REPORTS",
	  
		// Pilots/Operators
		"PILOTS_OPERATORS",
		"MY_PILOTS_OPERATORS",
		"PILOT_PENDING_INVITES",
	  
		// Settings
		"SETTINGS",
		"PRODUCTS",
		"INTEGRATIONS",
		"USER_ADMIN",
	)
	.required();
const createSchema: Schema = Joi.object({
	body: Joi.object({
		name: permissionTypeSchema.required(),
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
		name: permissionTypeSchema.required(),
	}).required(),
});

export default {
	createSchema,
	paramsSchema,
	updateSchema,
	
};
