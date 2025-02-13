import Joi, { Schema } from 'joi';

const equipmentTypeSchema = Joi.string()
	.valid('DRONE', 'TRACTOR', 'SPRAYER', 'OTHER')
	.required();

const createSchema: Schema = Joi.object({
	body: Joi.object({
		imageUrl: Joi.string().required(), // First name with minimum and maximum length
		serialNumber: Joi.string().max(50).required(), // State name
		equipmentType: equipmentTypeSchema.required(),
		isRegistered: Joi.boolean().required(),
		documentUrl: Joi.string().required(),
		warrantyExpiration: Joi.date().required(),
	}).required(),
});
const updateSchema: Schema = Joi.object({
	params: Joi.object({
		id: Joi.number().integer().positive().required(), // ID should be a positive number
	}).required(),
	body: Joi.object({
		imageUrl: Joi.string().optional(),
		serialNumber: Joi.string().max(50).optional(),
		equipmentType: Joi.string().optional(),
		isRegistered: Joi.boolean().optional(),
		documentUrl: Joi.string().optional(),
		warrantyExpiration: Joi.date().optional(),
	}).required(),
});

const paramsSchema: Schema = Joi.object({
	params: Joi.object({
		id: Joi.number().integer().positive().required(), // growerId should be a positive number
	}).required(),
});

export default { createSchema, paramsSchema, updateSchema };
