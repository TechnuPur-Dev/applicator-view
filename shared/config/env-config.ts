import path from 'path';
import Joi from 'joi';
import dotenv from 'dotenv';

// Load environment variables from the correct `.env` file
dotenv.config({
	path: path.join(__dirname, '../../.env'),
});

// Define the schema for environment variables validation
const envVarsSchema = Joi.object({
	ACCESS_TOKEN_SECRET: Joi.string()
		.required()
		.description('JWT Access key Secret.'),
	JWT_ACCESS_EXPIRATION_MINUTES: Joi.string()
		.default('30')
		.description('Number of minutes after which access token expires.'),

	AZURE_STORAGE_URL: Joi.string().required().description('Azure Storage URL'),
	AZURE_CONTAINER_NAME: Joi.string()
		.required()
		.description('Azure Container Name'),
	SMTP_HOST: Joi.string().description('server that will send the emails'),
	SMTP_PORT: Joi.number().description('port to connect to the email server'),
	SMTP_USERNAME: Joi.string().description('username for email server'),
	SMTP_PASSWORD: Joi.string().description('password for email server'),
	EMAIL_FROM: Joi.string().description(
		'the from field in the emails sent by the app',
	),
	EMAIL_SERVICE: Joi.string().description('Mail Service'),
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
	env: envVars.NODE_ENV,
	jwt: {
		accessSecret: envVars.ACCESS_TOKEN_SECRET as string,
		accessExpirationMinutes:
			envVars.JWT_ACCESS_EXPIRATION_MINUTES,
	},
	azureStorageUrl: envVars.AZURE_STORAGE_URL,
	azureContainerName: envVars.AZURE_CONTAINER_NAME,
	email: {
		service: envVars.EMAIL_SERVICE,
		smtp: {
			auth: {
				user: envVars.SMTP_USERNAME,
				pass: envVars.SMTP_PASSWORD,
			},
			host: envVars.SMTP_HOST,
			port: envVars.SMTP_PORT,
		},
		from: envVars.EMAIL_FROM,
	},
	googleCloudCredentials: envVars.GOOGLE_CLOUD_CREDENTIALS,
};

export default config; // Default export
