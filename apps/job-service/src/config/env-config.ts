import path from 'path';
import Joi from 'joi';
import dotenv from 'dotenv';

// Load environment variables from the correct `.env` file
dotenv.config({
	path: path.join(__dirname, '../../../../.env'),
});

// Log loaded environment variables for debugging
console.log('ENVIRONMENT VARIABLES LOADED:', {
	NODE_ENV: process.env.NODE_ENV,
	PORT: process.env.PORT,
	DATABASE_URL: process.env.DATABASE_URL,
});

// Define the schema for environment variables validation
const envVarsSchema = Joi.object({
	PORT: Joi.number().default(3000).description('Server Port'),
	NODE_ENV: Joi.string()
		.valid('production', 'development', 'test')
		.required(),
	ACCESS_TOKEN_SECRET: Joi.string()
		.required()
		.description('JWT Access key Secret'),
	REFRESH_TOKEN_SECRET: Joi.string()
		.required()
		.description('JWT Refresh key Secret'),
	JWT_ACCESS_EXPIRATION_MINUTES: Joi.string()
		.default('30')
		.description('Minutes after which access tokens expire'),
	JWT_REFRESH_EXPIRATION_DAYS: Joi.number()
		.default(30)
		.description('Days after which refresh tokens expire'),
	XAG_BASE_URL: Joi.string().required().description('XAG base url'),
	XAG_DEV_TOKEN: Joi.string().required().description('XAG dev token'),
}).unknown(true);

// Validate the environment variables
const { value: envVars, error } = envVarsSchema
	.prefs({ errors: { label: 'key' } })
	.validate(process.env);

if (error) {
	throw new Error(`Config validation error: ${error.message}`);
}

// Configuration object
const config = {
	env: envVars.NODE_ENV as string,
	port: envVars.PORT as number,
	jwt: {
		accessSecret: envVars.ACCESS_TOKEN_SECRET as string,
		refreshSecret: envVars.REFRESH_TOKEN_SECRET as string,
		accessExpirationMinutes:
			envVars.JWT_ACCESS_EXPIRATION_MINUTES as string,
		refreshExpirationDays: envVars.JWT_REFRESH_EXPIRATION_DAYS as number,
	},
	xag_base_url: envVars.XAG_BASE_URL as string,
	xag_dev_token: envVars.XAG_DEV_TOKEN as string,
};

export default config; // Default export
