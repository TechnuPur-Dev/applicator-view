import { Request, Response } from 'express';
import catchAsync from '../../../../../shared/utils/catch-async';
import httpStatus from 'http-status';
import userNotificationService from './user-notification-services';

const getAllNotificationByUserId = catchAsync(async (req: Request, res: Response) => {
	const userId = req.payload.id;
	const result = await userNotificationService.getAllNotificationByUserId(userId);
	res.status(httpStatus.OK).json(result);
});

export default {
    getAllNotificationByUserId
}


