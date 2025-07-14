import path from 'path';
import Joi from 'joi';
import dotenv from 'dotenv';

const env = process.env.NODE_ENV || 'development';

// Load shared vars
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Load env-specific overrides
dotenv.config({ path: path.resolve(process.cwd(), `.env.${env}`) });

// Define schema to validate all required env variables
const envVarsSchema = Joi.object({
	NODE_ENV: Joi.string()
		.valid('development', 'production', 'staging', 'test')
		.default('development'),

	STORAGE_PROVIDER: Joi.string()
		.valid('azure', 's3')
		.required()
		.description('Current storage provider: azure | s3'),

	// JWT
	ACCESS_TOKEN_SECRET: Joi.string()
		.required()
		.description('JWT access token secret'),
	JWT_ACCESS_EXPIRATION_MINUTES: Joi.string()
		.default('30')
		.description('Access token expiry in minutes'),

	// Azure Storage
	AZURE_STORAGE_URL: Joi.string().when('STORAGE_PROVIDER', {
		is: 'azure',
		then: Joi.required(),
		otherwise: Joi.optional(),
	}),
	AZURE_CONTAINER_NAME: Joi.string().when('STORAGE_PROVIDER', {
		is: 'azure',
		then: Joi.required(),
		otherwise: Joi.optional(),
	}),

	// AWS S3
	AWS_REGION: Joi.string().when('STORAGE_PROVIDER', {
		is: 's3',
		then: Joi.required(),
		otherwise: Joi.optional(),
	}),
	AWS_S3_BUCKET: Joi.string().when('STORAGE_PROVIDER', {
		is: 's3',
		then: Joi.required(),
		otherwise: Joi.optional(),
	}),
	AWS_ACCESS_KEY_ID: Joi.string().when('STORAGE_PROVIDER', {
		is: 's3',
		then: Joi.required(),
		otherwise: Joi.optional(),
	}),
	AWS_SECRET_ACCESS_KEY: Joi.string().when('STORAGE_PROVIDER', {
		is: 's3',
		then: Joi.required(),
		otherwise: Joi.optional(),
	}),

	// Email Config
	SMTP_HOST: Joi.string().optional(),
	SMTP_PORT: Joi.number().optional(),
	SMTP_USERNAME: Joi.string().optional(),
	SMTP_PASSWORD: Joi.string().optional(),
	EMAIL_FROM: Joi.string().optional(),
	EMAIL_SERVICE: Joi.string().optional(),

	// Optional Google Credentials
	GOOGLE_CLOUD_CREDENTIALS: Joi.string().optional(),
}).unknown(true);

// Validate
const { value: envVars, error } = envVarsSchema
	.prefs({ errors: { label: 'key' } })
	.validate(process.env);

if (error) {
	throw new Error(`Config validation error: ${error.message}`);
}

// Export structured config
const config = {
	env: envVars.NODE_ENV,
	storageProvider: envVars.STORAGE_PROVIDER,
	jwt: {
		accessSecret: envVars.ACCESS_TOKEN_SECRET as string,
		accessExpirationMinutes: envVars.JWT_ACCESS_EXPIRATION_MINUTES,
	},
	azure: {
		storageUrl: envVars.AZURE_STORAGE_URL,
		containerName: envVars.AZURE_CONTAINER_NAME,
	},
	aws: {
		region: envVars.AWS_REGION,
		s3Bucket: envVars.AWS_S3_BUCKET,
		accessKeyId: envVars.AWS_ACCESS_KEY_ID,
		secretAccessKey: envVars.AWS_SECRET_ACCESS_KEY,
	},
	email: {
		service: envVars.EMAIL_SERVICE,
		from: envVars.EMAIL_FROM,
		smtp: {
			host: envVars.SMTP_HOST,
			port: envVars.SMTP_PORT,
			auth: {
				user: envVars.SMTP_USERNAME,
				pass: envVars.SMTP_PASSWORD,
			},
		},
	},
	googleCloudCredentials: envVars.GOOGLE_CLOUD_CREDENTIALS,
};

export default config;
