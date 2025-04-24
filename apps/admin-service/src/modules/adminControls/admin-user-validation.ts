import Joi, { Schema } from 'joi';
import {
	phoneNumberSchema,
} from '../../../../../shared/utils/joi-common-validations';

const createData: Schema = Joi.object({
    body:Joi.object({
		firstName: Joi.string().min(1).max(50).required(), // First name with minimum and maximum length
		lastName: Joi.string().min(1).max(50).required(), // Last name with minimum and maximum length
		email: Joi.string().email().required(), // Valid email address
		phoneNumber: phoneNumberSchema.required(), // International phone number format
		address1: Joi.string().max(100).required(), // Address line 1
		address2: Joi.string().max(100).optional().allow(''), // Address line 2
		stateId: Joi.number().integer().positive().required(), // StateId
		county: Joi.string().max(50).required(), // County name
		township: Joi.string().max(50).required(), // Township name
		zipCode: Joi.string()
			.pattern(/^\d{5}(-\d{4})?$/)
			.required(), // ZIP code in standard formats
		bio: Joi.string().max(500).optional().allow(''), // Short biography
		additionalInfo: Joi.string().max(500).optional().allow(''), // Additional information as a flexible object
	}).required(),
})
const paramsSchema: Schema = Joi.object({
	params: Joi.object({
		userId: Joi.number().integer().positive(),
	
	})
		// .or('id', 'growerId', 'applicatorId') // At least one must be present
		.required(),
});


export default {
	paramsSchema,
	createData
	
};
