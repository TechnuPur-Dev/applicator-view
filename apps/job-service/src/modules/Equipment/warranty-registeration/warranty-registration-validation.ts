import Joi, { Schema } from 'joi';

const equipmentTypeSchema = Joi.string()
	.valid('DRONE', 'TRACTOR', 'SPRAYER', 'OTHER')
	.required();


const createSchema: Schema = Joi.object({
	// params: Joi.object({
	// 	growerId: Joi.number().integer().positive().required(), // growerId should be a positive number
	// }).required(),
	body: Joi.object({
		imageUrl: Joi.string().min(1).max(100).required(), // First name with minimum and maximum length
		serialNumber: Joi.string().max(50).required(), // State name
		equipmentType: equipmentTypeSchema.required(),
		isRegistered: Joi.boolean().required(),
		documentUrl: Joi.string().min(1).max(100).required(),
		warrantyExpiration: Joi.date().required(),
	
	}).required(),
});
const updateSchema: Schema = Joi.object({
	params: Joi.object({
		id: Joi.number().integer().positive().required(), // ID should be a positive number
	}).required(),
	body: Joi.object({
		imageUrl: Joi.string().min(1).max(100).optional(),
		serialNumber: Joi.string().max(50).optional(),
		equipmentType: Joi.string().required(),
		isRegistered: Joi.boolean().required(),
		documentUrl: Joi.string().min(1).max(100).optional(),
		warrantyExpiration: Joi.date().optional(),
	}).required(),
});

const paramsSchema: Schema = Joi.object({
	params: Joi.object({
		id: Joi.number().integer().positive().required(), // growerId should be a positive number
	}).required(),
});


export default { createSchema, paramsSchema,updateSchema };
