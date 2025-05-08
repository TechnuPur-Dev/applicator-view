import Joi, { Schema } from 'joi';
// import {
// 	inviteStatusSchema,
// } from '../../../../../shared/utils/joi-common-validations';


const paramsSchema: Schema = Joi.object({
	params: Joi.object({
		userId: Joi.number().integer().positive(),
	
	})
		// .or('id', 'growerId', 'applicatorId') // At least one must be present
		.required(),
});


export default {
	paramsSchema,
	
};
