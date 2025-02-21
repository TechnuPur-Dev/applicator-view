import { Request, Response, NextFunction } from 'express';
import { prisma } from '../libs/prisma-client';
import JWT from 'jsonwebtoken';
import httpStatus from 'http-status';
import config from '../config/env-config';
import { JsonWebTokenError } from 'jsonwebtoken';
import { UserRole } from '@prisma/client';

interface JwtPayload {
	id: number;
	email?: string;
	password?: string;
}

const verifyToken = async (
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> => {
	try {
		const authHeader = req.headers.authorization;
		if (!authHeader) {
			res.status(httpStatus.UNAUTHORIZED).json({
				message: 'Token not found in request headers.',
			});
			return;
		}

		const bearerToken = authHeader.split(' ');
		const token = bearerToken[1];

		const payload = (await verifyTokenAsync(
			token,
			config.jwt.accessSecret,
		)) as JwtPayload;

		const user = await prisma.user.findUnique({
			where: { id: payload.id },
			select: {
				id: true,
				firstName: true,
				lastName: true,
				fullName: true,
				email: true,
				role: true,
			},
		});

		if (!user) {
			res.status(httpStatus.NOT_FOUND).json({
				message: 'User not Found.',
			});
			return;
		}

		req.payload = payload;
		req.user = user;
		next();
	} catch (err: unknown) {
		if (err instanceof JsonWebTokenError) {
			// Narrow down to JsonWebTokenError
			res.status(httpStatus.UNAUTHORIZED).json({
				message: 'UNAUTHORIZED',
			});
		} else if (err instanceof Error) {
			res.status(httpStatus.UNAUTHORIZED).json({
				status: 'UNAUTHORIZED',
				message: err.message,
			});
		} else {
			res.status(httpStatus.UNAUTHORIZED).json({
				status: 'UNAUTHORIZED',
				message: 'An unknown error occurred.',
			});
		}
	}
};

const verifyTokenAsync = (
	token: string,
	secret: string,
): Promise<JwtPayload> => {
	return new Promise((resolve, reject) => {
		JWT.verify(token, secret, (err, decoded) => {
			if (err) {
				reject(err);
			} else {
				resolve(decoded as JwtPayload);
			}
		});
	});
};

const authorize =
	(...allowedRoles: UserRole[]) =>
	(req: Request, res: Response, next: NextFunction) => {
		// Ensure user is authenticated
		if (!req.user) {
			res.status(401).json({ message: 'Unauthorized' });
			return;
		}

		// Check if user's role is included in allowed roles
		if (!allowedRoles.includes(req.user.role)) {
			res.status(403).json({ message: 'Forbidden: Access denied' });
			return;
		}

		next(); // Proceed to the next middleware/controller
	};
export { verifyToken, authorize };
