import Joi, { Schema } from 'joi';

// Regular Expressions
// const PHONE_REGEX = /^\+(?:[0-9] ?){6,14}[0-9]$/;
const USERNAME_REGEX = /^[a-zA-Z0-9_]*$/;
const PASSWORD_REGEX = /[!@#$%^&*(),.?":{}|<>]/;

// Individual Schemas
// const phoneNumberSchema: Schema = Joi.string().pattern(PHONE_REGEX).required(); Removed Regex for phone number temporarily for demo
const phoneNumberSchema: Schema = Joi.string().required();
const userNameSchema: Schema = Joi.string()
	.pattern(USERNAME_REGEX)
	.min(4)
	.max(20)
	.required();
const passwordSchema: Schema = Joi.string()
	.pattern(PASSWORD_REGEX)
	.min(8)
	.max(40)
	.required();
const idSchema: Schema = Joi.number().integer().positive().required();
const arrayOfIds: Schema = Joi.array().items(idSchema).required();

// Pagination Schema
const paginationSchema = Joi.object({
	limit: Joi.number().integer().positive().required(),
	page: Joi.number().integer().positive().required(),
	pivotMessageId: Joi.number().integer().positive().optional(),
});

// Status and Role Schemas
const inviteStatusSchema: Schema = Joi.string()
	.valid('NOT_SENT', 'PENDING', 'ACCEPTED', 'REJECTED')
	.required();
const userRoleSchema: Schema = Joi.string()
	.valid('GROWER', 'APPLICATOR', 'WORKER')
	.required();
const otpSchema = Joi.number().integer().positive().min(100000).max(999999);

// Export Schemas
export {
	phoneNumberSchema,
	userNameSchema,
	passwordSchema,
	paginationSchema,
	idSchema,
	inviteStatusSchema,
	arrayOfIds,
	userRoleSchema,
	otpSchema,
};
