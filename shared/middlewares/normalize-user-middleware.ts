import { Request, Response, NextFunction } from 'express';
import { prisma } from '../libs/prisma-client';
import { UserRole } from '@prisma/client';

export const normalizeApplicatorUser = async (
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> => {
	try {
		const user = req.user;

		if (user?.role === UserRole.APPLICATOR_USER) {
			const applicatorUser = await prisma.applicatorUser.findFirst({
				where: { userId: user.id },
				include: { applicator: true },
			});

			if (!applicatorUser || !applicatorUser.applicator) {
				res.status(401).json({ message: 'Invalid applicator user' });
				return;
			}

			req.payload.id = applicatorUser.applicator.id;
			req.user = {
				...user,
				id: applicatorUser.applicator.id,
				role: UserRole.APPLICATOR,
				originalUserId: user.id,
				originalRole: UserRole.APPLICATOR_USER,
				isChildUser: true,
			};
		}

		console.log(req.user);

		next(); // Always call next()
	} catch (err) {
		if (err instanceof Error) {
			res.status(httpStatus.UNAUTHORIZED).json({
				status: 'UNAUTHORIZED',
				message: err.message,
			});
		}
	}
};
