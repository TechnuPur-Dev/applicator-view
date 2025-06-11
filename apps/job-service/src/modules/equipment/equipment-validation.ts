import Joi, { Schema } from 'joi';

const equipmentTypeSchema = Joi.string()
	.valid('DRONE', 'TRACTOR', 'SPRAYER', 'OTHER')
	.required();

const createSchema: Schema = Joi.object({
	body: Joi.object({
		manufacturer: Joi.string().required(), // First name with minimum and maximum length
		type: equipmentTypeSchema.required(),
		model: Joi.string().required(),
		nickname: Joi.string().optional(),
		serialNumber: Joi.string().max(50).required(),
		userId: Joi.number().max(50).required()


	}).required(),
});
const updateSchema: Schema = Joi.object({
	params: Joi.object({
		id: Joi.number().integer().positive().required(), // growerId should be a positive number
	}).required(),
	body: Joi.object({
		manufacturer: Joi.string().optional(), // First name with minimum and maximum length
		type: equipmentTypeSchema.optional(),
		model: Joi.string().optional(),
		nickname: Joi.string().optional(),
		serialNumber: Joi.string().max(50).optional(),
		userId: Joi.number().max(50).optional()
	}).required(),
});


const paramsSchema: Schema = Joi.object({
	params: Joi.object({
		id: Joi.number().integer().positive().required(), // growerId should be a positive number
	}).required(),
});

export default { createSchema, paramsSchema, updateSchema };
