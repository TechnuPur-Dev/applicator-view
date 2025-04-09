import Joi, { Schema } from 'joi';

const ticketStatusSchema = Joi.string()
	.valid('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')
	.required();

const ticketCategorySchema = Joi.string()
	.valid('TECHNICAL', 'BILLING', 'GENERAL', 'OTHER')
	.required();

const ticketPrioritySchema = Joi.string()
	.valid('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')
	.required();
const resolvedTicketStatusSchema = Joi.string()
	.valid('IN_PROGRESS', 'RESOLVED')
	.required();
const supportTicketSchema: Schema = Joi.object({
	// params: Joi.object({
	// 	growerId: Joi.number().integer().positive().required(), // growerId should be a positive number
	// }).required(),
	body: Joi.object({
		subject: Joi.string().min(1).max(50).required(), // First name with minimum and maximum length
		description: Joi.string().max(50).optional(), // State name
		status: ticketStatusSchema.optional(),
		assigneeId: Joi.number().integer().positive().allow(null).optional(),
		jobId: Joi.number().integer().positive().optional(),
		category: ticketCategorySchema.required(),
		priority: ticketPrioritySchema.required(), // Township name
	}).required(),
});

const paramsSchema: Schema = Joi.object({
	params: Joi.object({
		ticketId: Joi.number().integer().positive().required(), // growerId should be a positive number
	}).required(),
});

const updateSupportTicketSchema: Schema = Joi.object({
	params: Joi.object({
		ticketId: Joi.number().integer().positive().required(), // growerId should be a positive number
	}).required(),
	body: Joi.object({
		status: ticketStatusSchema.optional(),
		assigneeId: Joi.number().integer().positive().optional(),
		priority: ticketPrioritySchema.optional(), // Township name
	}).required(),
});
const resolveSupportTicketSchema: Schema = Joi.object({
	params: Joi.object({
		ticketId: Joi.number().integer().positive().required(), // growerId should be a positive number
	}).required(),
	body: Joi.object({
		status: resolvedTicketStatusSchema.required(),
	}).required(),
});
const assignSupportTicketSchema: Schema = Joi.object({
	params: Joi.object({
		ticketId: Joi.number().integer().positive().required(), // growerId should be a positive number
	}).required(),
	body: Joi.object({
		assigneeId: Joi.number().integer().positive().allow(null).optional(),
	}).required(),
});
export default {
	supportTicketSchema,
	paramsSchema,
	updateSupportTicketSchema,
	resolveSupportTicketSchema,
	assignSupportTicketSchema,
};
