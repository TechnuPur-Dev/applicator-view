import Joi, { Schema } from 'joi';


const paramsSchema: Schema = Joi.object({
	params: Joi.object({
		id: Joi.number().integer().positive(),
	})
		.or('id') // At least one must be present
		.required(),
});
const ChemicalUpdateSchema: Schema = Joi.object({
    params: Joi.object({
        id: Joi.number().integer().positive().required(), 
    }).required(),
    body: Joi.object({
        name: Joi.string().min(1).max(50).required(), 
        
    }).required(),
})

export default {
	paramsSchema,
	ChemicalUpdateSchema,
};
