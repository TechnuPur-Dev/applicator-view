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
	SMARTY_AUTH_ID: Joi.string().required().description('Auth ID for SMARTY'),
	SMARTY_AUTH_TOKEN: Joi.string()
		.required()
		.description('Auth Token for SMARTY'),
	OPEN_WEATHER_API_KEY: Joi.string()
		.required()
		.description('API key for openWeather'),
	JD_CLIENT_ID: Joi.string()
		.required()
		.description(
			'Client ID provided by John Deere Operations Center for OAuth authentication',
		),

	JD_CLIENT_SECRET: Joi.string()
		.required()
		.description(
			'Client Secret provided by John Deere Operations Center for secure token exchange',
		),

	JD_REDIRECT_URI: Joi.string()
		.required()
		.description(
			'Redirect URI registered in the John Deere developer portal for OAuth callback',
		),

	JD_STATE_STRING: Joi.string()
		.required()
		.description(
			'Static or dynamically generated state string to prevent CSRF in OAuth flow',
		),

	JD_SCOPE: Joi.string()
		.required()
		.description(
			'Scopes requested from John Deere for accessing user data (e.g., ag1, offline_access)',
		),
	JD_AUTH_HEADER: Joi.string()
		.required()
		.description(
			'Auth header is base64 string of both jdClientId and jdClientSecret',
		),
	JD_API_URL: Joi.string()
		.required()
		.description('URL of John Deere Operation Center APIs'),
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
	smarty: {
		smartyAuthId: envVars.SMARTY_AUTH_ID as string,
		smartyAuthToken: envVars.SMARTY_AUTH_TOKEN as string,
	},
	openWeatherKey: envVars.OPEN_WEATHER_API_KEY as string,
	johnDeere: {
		jdClientId: envVars.JD_CLIENT_ID as string,
		jdClientSecret: envVars.JD_CLIENT_SECRET as string,
		jdRedirectUri: envVars.JD_REDIRECT_URI as string,
		jdStateString: envVars.JD_STATE_STRING as string,
		jdScope: envVars.JD_SCOPE as string,
		jdAuthHeader: envVars.JD_AUTH_HEADER as string,
		jdAPIUrl: envVars.JD_API_URL as string,
	},
};

export default config; // Default export
