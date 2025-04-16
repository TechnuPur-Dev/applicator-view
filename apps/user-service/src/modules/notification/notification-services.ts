import httpStatus from 'http-status';
import { prisma } from '../../../../../shared/libs/prisma-client';
import ApiError from '../../../../../shared/utils/api-error';
import { PaginateOptions } from '../../../../../shared/types/global';

// get all notification by current user Id
const getAllNotificationByUserId = async (userId: number, options: PaginateOptions) => {
	const limit = options.limit && parseInt(options.limit, 10) > 0
		? parseInt(options.limit, 10)
		: 10;

	const page = options.page && parseInt(options.page, 10) > 0
		? parseInt(options.page, 10)
		: 1;

	const skip = (page - 1) * limit;

	const notifications = await prisma.notification.findMany({
		where: { userId },
		include: {
			invite: true, // we include full invite here, but later we'll filter it
		},
		skip,
		take: limit,
		orderBy: {
			id: 'desc',
		},
	});

	if (!notifications) {
		throw new ApiError(httpStatus.NOT_FOUND, 'No notifications found for this user.');
	}

	const totalResults = await prisma.notification.count({
		where: { userId },
	});
	const totalPages = Math.ceil(totalResults / limit);

	// Format notifications with selective invite fields
	const formattedNotifications = notifications.map((notif) => {
		const invite = notif.invite;

		let filteredInvite = null;
		if (invite) {
			if (invite.inviteInitiator === 'APPLICATOR') {
				filteredInvite = {
					inviteInitiator: invite.inviteInitiator,
					applicatorId: invite.applicatorId,
					applicatorFirstName: invite.applicatorFirstName,
					applicatorLastName: invite.applicatorLastName,
				};
			} else if (invite.inviteInitiator === 'GROWER') {
				filteredInvite = {
					inviteInitiator: invite.inviteInitiator,
					growerId: invite.growerId,
					growerFirstName: invite.growerFirstName,
					growerLastName: invite.growerLastName,
				};
			}
		}

		// Return the full notification data, but replace invite with filteredInvite
		return {
			...notif,
			invite: filteredInvite,
		};
	});

	return {
		result: formattedNotifications,
		page,
		limit,
		totalPages,
		totalResults,
	};
};


export default {
	getAllNotificationByUserId,
};
