import { Request, Response } from 'express';
import catchAsync from '../../../../../shared/utils/catch-async';
import httpStatus from 'http-status';
import userNotificationService from './notification-services';
import pick from '../../../../../shared/utils/pick';

const getAllNotificationsByUserId = catchAsync(
	async (req: Request, res: Response) => {
		const options = pick(req.query, ['limit', 'page']);
		const user = req.user;
		const result = await userNotificationService.getAllNotificationsByUserId(
			user,
			options,
		);
		res.status(httpStatus.OK).json(result);
	},
);

export default {
	getAllNotificationsByUserId,
};
