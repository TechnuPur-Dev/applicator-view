import Joi, { Schema } from 'joi';


const createSchema: Schema = Joi.object({
	body: Joi.object({
		name: Joi.string().min(1).max(50).required(),
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
		name: Joi.string().min(1).max(50).optional(),
	}).required(),
});

export default {
	createSchema,
	paramsSchema,
	updateSchema,
	
};
