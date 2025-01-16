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
	jwt: {
		accessSecret: envVars.ACCESS_TOKEN_SECRET as string,
		accessExpirationMinutes:
			envVars.JWT_ACCESS_EXPIRATION_MINUTES as string,
	},
	azureStorageUrl: envVars.AZURE_STORAGE_URL,
	azureContainerName: envVars.AZURE_CONTAINER_NAME,
};

export default config; // Default export
