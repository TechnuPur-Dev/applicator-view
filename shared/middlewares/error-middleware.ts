import fs from 'fs';
import path from 'path';
import httpStatus from 'http-status';
import createLoggerInstance from '../utils/logger';
import ApiError from '../utils/api-error';
import {
	isPrismaError,
	getPrismaErrorMessage,
} from '../utils/prisma-error-mapper';
import { Request, Response, NextFunction } from 'express';

interface ErrorWithStatus {
	statusCode: number;
	message: string;
}

const logsDirectory = path.join(__dirname, '../../logs');

// Ensure the log directory exists
function ensureDirectoryExists(directory: string): void {
	if (!fs.existsSync(directory)) {
		fs.mkdirSync(directory, { recursive: true });
	}
}

// Get the log file path based on the current date
function getLogFilePath(): string {
	const currentDate = new Date();
	const year = currentDate.getFullYear();
	const month = String(currentDate.getMonth() + 1).padStart(2, '0');
	const day = String(currentDate.getDate()).padStart(2, '0');
	const fileName = `${year}-${month}-${day}.log`;
	return path.join(logsDirectory, fileName);
}

// Write log entry to the log file
function writeLog(logEntry: object): void {
	const logFilePath = getLogFilePath();
	ensureDirectoryExists(logsDirectory);
	fs.appendFile(logFilePath, JSON.stringify(logEntry) + '\n', (err) => {
		if (err) {
			console.error('Error writing to log file:', err);
		}
	});
}

// Error converter middleware to handle Prisma and API errors
const errorConverter = (
	err: unknown,
	req: Request,
	res: Response,
	next: NextFunction,
): void => {
	let error = err;

	// Handle Prisma error
	if (isPrismaError(err)) {
		console.log('Prisma errorrrrrrrrrrrrrr: ');
		const { httpStatus, message } = getPrismaErrorMessage(err);
		error = new ApiError(httpStatus, message, false, (err as Error).stack);
	} else if (err instanceof ApiError) {
		// Handle API errors
		error = err;
	} else if (err instanceof Error) {
		// Handle general errors
		const statusCode = httpStatus.INTERNAL_SERVER_ERROR;
		const message = err.message || 'Internal Server Error';
		error = new ApiError(statusCode, message, false, err.stack);
	} else {
		// Fallback for unknown errors
		error = new ApiError(
			httpStatus.INTERNAL_SERVER_ERROR,
			'An unknown error occurred',
			false,
		);
	}

	next(error);
};

// Error handler middleware to send error response and log it

function createErrorHandler(config: { env: string }) {
	return (
		err: Record<string, unknown>,
		req: Request,
		res: Response,
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		next: NextFunction,
	): void => {
		const logger = createLoggerInstance(config);
		let { statusCode, message } = err as unknown as ErrorWithStatus;

		if (config.env === 'production' && !err.isOperational) {
			statusCode = 500;
			message = 'Internal Server Error';
		}

		if (typeof message === 'string' && message.startsWith('Error: ')) {
			message = message.split('Error: ')[1];
		}

		const response = {
			code: statusCode,
			message,
			...(config.env === 'development' && { stack: err.stack }),
		};

		const logEntry = {
			method: req.method,
			statusCode,
			path: req.path,
			requestBody: JSON.stringify(req.body),
			message,
			errorStack: err.stack,
			timestamp: new Date().toISOString(),
		};

		// Log the error in development environment
		if (config.env === 'development') {
			logger.error(err);
			writeLog(logEntry);
		}

		res.status(statusCode).send(response);
	};
}

export { errorConverter, createErrorHandler };
