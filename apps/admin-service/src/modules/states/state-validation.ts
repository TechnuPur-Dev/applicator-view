import Joi, { Schema } from 'joi';


const paramsSchema: Schema = Joi.object({
	params: Joi.object({
		stateId: Joi.number().integer().positive(),
		countyId: Joi.number().integer().positive(),
		townshipId: Joi.number().integer().positive(),

	})
		.or('stateId', 'countyId','townshipId') // At least one must be present
		.required(),
});
const stateUpdateSchema: Schema = Joi.object({
    params: Joi.object({
        stateId: Joi.number().integer().positive().required(), 
    }).required(),
    body: Joi.object({
        name: Joi.string().min(1).max(50).required(), 
        
    }).required(),
})

export default {
	paramsSchema,
	stateUpdateSchema,
};
