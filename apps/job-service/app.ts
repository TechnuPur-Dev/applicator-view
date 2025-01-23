import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import httpStatus from 'http-status';

import routes from './src/modules/index'; // API routes
import config from './src/config/env-config'; // Environment configuration

import { createMorganMiddleware } from '../../shared/middlewares/morgan-middleware'; // Logging middleware
import ApiNotFoundError from '../../shared/utils/api-error'; // Custom Not Found Error
import {
	errorConverter,
	createErrorHandler,
} from '../../shared/middlewares/error-middleware'; // Error handling middlewares

const app = express();

// ======== Logging Middleware Setup ========
if (config.env !== 'test') {
	const {
		successHandler: morganSuccessHandler,
		errorHandler: morganErrorHandler,
	} = createMorganMiddleware(config);

	app.use(morganSuccessHandler);
	app.use(morganErrorHandler);
}

// ======== Global Middlewares ========
app.use(express.json({ limit: '50mb' })); // Parse JSON requests
app.use(express.urlencoded({ limit: '50mb', extended: true })); // Parse URL-encoded requests
app.use(cors()); // Enable CORS
app.options('*', cors());
app.use(helmet()); // Secure HTTP headers
app.use(compression()); // Gzip compression

// ======== API Routes ========
app.use('/', routes);

// ======== 404 Not Found Middleware ========
app.use((req, res, next) => {
	next(new ApiNotFoundError(httpStatus.NOT_FOUND, `${req.url} Not found`));
});

// ======== Error Handling Middleware ========
const errorHandler = createErrorHandler(config); // Initialize error handler
app.use(errorConverter); // Convert non-ApiError to ApiError
app.use(errorHandler); // Handle ApiErrors

export default app;
