import httpStatus from 'http-status';
import { prisma } from '../../../../../shared/libs/prisma-client';
import ApiError from '../../../../../shared/utils/api-error';
import { PaginateOptions } from '../../../../../shared/types/global';

// get all notification by current user Id
const getAllNotificationByUserId = async (userId: number,options: PaginateOptions) => {
	const limit =
	options.limit && parseInt(options.limit, 10) > 0
		? parseInt(options.limit, 10)
		: 10;
// Set the page number, default to 1 if not specified or invalid
const page =
	options.page && parseInt(options.page, 10) > 0
		? parseInt(options.page, 10)
		: 1;
// Calculate the number of users to skip based on the current page and limit
const skip = (page - 1) * limit;

	const notification = await prisma.notification.findMany({
		where: {
			userId,
		},
		skip,
		take: limit,
		orderBy: {
			id: 'desc',
		},
	});
	// Check if user is null
	if (!notification) {
		throw new ApiError(
			httpStatus.NOT_FOUND,
			'A notification with this user id does not exist.',
		);
	}
	const totalResults = await prisma.notification.count({
		where: {
			userId,
		},
	});

	const totalPages = Math.ceil(totalResults / limit);
	// Return the paginated result including users, current page, limit, total pages, and total results
	return {
		result: notification,
		page,
		limit,
		totalPages,
		totalResults,
	};
};

export default {
	getAllNotificationByUserId,
};
