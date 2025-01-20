import Joi, { Schema } from 'joi';
// import {
// 	phoneNumberSchema,
// 	passwordSchema,
// 	userRoleSchema,
// } from '../../../../../shared/utils/joi-common-validations';

const farmSchema: Schema = Joi.object({
	params: Joi.object({
		growerId: Joi.number().integer().positive().required(), // growerId should be a positive number
	}).required(),
	body: Joi.object({
		name: Joi.string().min(1).max(50).required(), // First name with minimum and maximum length
		state: Joi.string().max(50).required(), // State name
		county: Joi.string().max(50).required(), // County name
		township: Joi.string().max(50).required(), // Township name
		zipCode: Joi.string()
			.pattern(/^\d{5}(-\d{4})?$/)
			.required(), // ZIP code in standard formats
		isActive: Joi.boolean().required(),
	}).required(),
});

const paramsSchema: Schema = Joi.object({
	params: Joi.object({
		farmId: Joi.number().integer().positive().required(), // growerId should be a positive number
	}).required(),
	
	
	
});

const farmUpdateSchema: Schema = Joi.object({
	params: Joi.object({
		farmId: Joi.number().integer().positive().required(), // growerId should be a positive number
	}).required(),
	body: Joi.object({
		name: Joi.string().min(1).max(50).required(), // First name with minimum and maximum length
		state: Joi.string().max(50).required(), // State name
		county: Joi.string().max(50).required(), // County name
		township: Joi.string().max(50).required(), // Township name
		zipCode: Joi.string()
			.pattern(/^\d{5}(-\d{4})?$/)
			.required(), // ZIP code in standard formats
		isActive: Joi.boolean().required(),
	}).required(),
})
export default { farmSchema ,paramsSchema,farmUpdateSchema};
