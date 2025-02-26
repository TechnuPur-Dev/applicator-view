import httpStatus from 'http-status';
import { prisma } from '../../../../../shared/libs/prisma-client';
import ApiError from '../../../../../shared/utils/api-error';

// get all notification by current user Id
const getAllNotificationByUserId = async (userId: number) => {
	const notification = await prisma.notification.findMany({
		where: {
			userId,
		},
	});
	// Check if user is null
	if (!notification) {
		throw new ApiError(
			httpStatus.NOT_FOUND,
			'A notification with this user id does not exist.',
		);
	}
	return notification;
};

export default {
	getAllNotificationByUserId,
};
