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
			job:true,
			ticket:true
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
		let filteredInvite = null;
		let filteredJob = null;
		let filteredTicket = null;
		switch (notif.type) {
			case 'ACCOUNT_INVITATION':
			case 'ACCEPT_INVITE':
			case 'REJECT_INVITE':
		
		if (notif.invite) {
			const invite = notif.invite;
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
		break;
		case 'JOB_ASSIGNED':
		case 'JOB_ACCEPTED':
		case 'JOB_REJECTED':
		case 'JOB_REQUEST':
		case 'JOB_COMPLETED':
		case 'BID_PLACED':
		case 'BID_ACCEPTED':
			if (notif.job) {
				const jobInvite = notif.job
				filteredJob = {
				
					title: jobInvite.title,
					type: jobInvite.type,
					status: jobInvite.status
				};
			}
			break;
			case 'TICKET_ASSIGNED':
		    case 'TICKET_RESOLVED':
			if (notif.ticket) {
				filteredTicket = {
				
					subject: notif.ticket.subject,
					status: notif.ticket.status,
					description: notif.ticket.description
				};
			}
			break;
	}
		// Return the full notification data, but replace invite with filteredInvite
		return {
			...notif,
			invite: filteredInvite,
			job:filteredJob,
			ticket:filteredTicket
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
