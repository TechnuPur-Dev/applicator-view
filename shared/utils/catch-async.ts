import { Request, Response, NextFunction } from 'express';

/**
 * A higher-order function that catches errors in async route handlers.
 * @param fn The async route handler function
 * @returns A function that handles errors from the async route handler
 */
const catchAsync =
	(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
	(req: Request, res: Response, next: NextFunction): void => {
		Promise.resolve(fn(req, res, next)).catch(next);
	};

export default catchAsync;
