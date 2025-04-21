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

const updateArchiveStatus: Schema = Joi.object({
	body: Joi.object({
		userId: Joi.number().integer().positive().required(),
		archiveStatus: Joi.boolean().optional(),
		canManageFarmsStauts: Joi.boolean().optional(),
	}).required(),
});





export default {
	paramsSchema,
	updateArchiveStatus,
	
};
