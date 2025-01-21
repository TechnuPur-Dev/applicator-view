import Joi, { Schema } from 'joi';

const createFieldSchema: Schema = Joi.object({
	body: Joi.object({
		name: Joi.string().min(1).max(50).required(), 
		crop: Joi.string().min(1).max(50).required(), 
		legal: Joi.string().max(100).required(), 
		latitude: Joi.string().max(50).required(), 
		longitude: Joi.string().max(50).required(), 
		acres: Joi.number().positive().precision(2).required(),
		farmId: Joi.number().integer().positive().required(), 
		
    }).required(),
});

const paramsSchema: Schema = Joi.object({
	params: Joi.object({
		id: Joi.number().integer().positive(),
		
	}).required(),
});

const editFieldSchema: Schema = Joi.object({
    params: Joi.object({
		id: Joi.number().integer().positive(),
		
	}).required(),
	body: Joi.object({
		name: Joi.string().min(1).max(50).optional(), 
		crop: Joi.string().min(1).max(50).optional(), 
		legal: Joi.string().max(100).optional(), 
		latitude: Joi.string().max(50).optional(), 
		acres: Joi.number().positive().precision(2).optional(),
		longitude: Joi.string().max(50).optional(), 
		farmId: Joi.number().integer().positive().optional(), 
		
    }).required(),
});

export default { createFieldSchema, paramsSchema, editFieldSchema };
