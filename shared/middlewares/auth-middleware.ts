import { Request, Response, NextFunction } from 'express';
import { prisma } from '../libs/prisma-client';
import JWT from 'jsonwebtoken';
import httpStatus from 'http-status';
import config from '../config/env-config';
import { JsonWebTokenError } from 'jsonwebtoken';

interface JwtPayload {
	id: number;
	email?: string;
	password?: string;
}

export const verifyToken = async (
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
