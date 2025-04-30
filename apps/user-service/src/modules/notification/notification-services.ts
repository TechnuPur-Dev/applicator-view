import httpStatus from 'http-status';
import { prisma } from '../../../../../shared/libs/prisma-client';
import ApiError from '../../../../../shared/utils/api-error';
import { PaginateOptions, User } from '../../../../../shared/types/global';

const getAllNotificationsByUserId = async (
	user: User,
	options: PaginateOptions,
) => {
	const { id: userId } = user;

	const limit =
		options.limit && parseInt(options.limit, 10) > 0
			? parseInt(options.limit, 10)
			: 10;

	const page =
		options.page && parseInt(options.page, 10) > 0
			? parseInt(options.page, 10)
			: 1;
	const skip = (page - 1) * limit;
	await prisma.user.update({
		where: { id: userId },
		data: { lastViewedAt: new Date() },
	});

	const [notifications, totalResults] = await Promise.all([
		prisma.notification.findMany({
			where: { userId },
			include: {
				invite: true,
				job: {
					include: {
						grower: true,
						applicator: true,
						fieldWorker: true,
					},
				},
				ticket: true,
				bid: {
					select: {
						applicator: {
							select: {
								id: true,
								firstName: true,
								lastName: true,
							},
						},
					},
				},
				workerInvite: {
					include: {
						applicator: {
							select: {
								firstName: true,
								lastName: true,
							},
						},
					},
				},
			},
			skip,
			take: limit,
			orderBy: { id: 'desc' },
		}),
		prisma.notification.count({ where: { userId } }),
	]);

	if (!notifications.length) {
		throw new ApiError(
			httpStatus.NOT_FOUND,
			'No notifications found for this user.',
		);
	}

	console.log(notifications);

	const formattedNotifications = notifications.map((notif) => {
		const { invite, job, ticket, type, workerInvite } = notif;
		let filteredInvite, filteredJob, filteredTicket;

		if (
			['ACCOUNT_INVITATION', 'ACCEPT_INVITE', 'REJECT_INVITE'].includes(
				type,
			) &&
			(invite || workerInvite)
		) {
			const commonFields = {
				inviteId: invite?.id,
				inviteInitiator: invite?.inviteInitiator,
			};
			if (invite?.inviteInitiator === 'APPLICATOR') {
				filteredInvite =
					type === 'ACCOUNT_INVITATION'
						? {
								...commonFields,
								applicatorId: invite.applicatorId,
								applicatorFirstName: invite.applicatorFirstName,
								applicatorLastName: invite.applicatorLastName,
							}
						: {
								inviteId: invite.id,
								growerId: invite.growerId,
								growerFirstName: invite.growerFirstName,
								growerLastName: invite.growerLastName,
								status: invite.inviteStatus,
							};
			} else if (invite?.inviteInitiator === 'GROWER') {
				filteredInvite =
					type === 'ACCOUNT_INVITATION'
						? {
								...commonFields,
								growerId: invite.growerId,
								growerFirstName: invite.growerFirstName,
								growerLastName: invite.growerLastName,
							}
						: {
								inviteId: invite.id,
								applicatorId: invite.applicatorId,
								applicatorFirstName: invite.applicatorFirstName,
								applicatorLastName: invite.applicatorLastName,
								status: invite.inviteStatus,
							};
			} else if (workerInvite) {
				filteredInvite = {
					inviteId: workerInvite.id,
					applicatorId: workerInvite.applicatorId,
					applicatorFirstName: workerInvite.applicator.firstName,
					applicatorLastName: workerInvite.applicator.lastName,
					status: workerInvite.inviteStatus,
				};
			}
		}

		if (
			[
				'JOB_REQUEST',
				'JOB_ACCEPTED',
				'JOB_REJECTED',
				'PILOT_JOB_ACCEPTED',
				'PILOT_JOB_REJECTED',
				'JOB_ASSIGNED',
				'JOB_COMPLETED',
				'INVOICE_GENERATED',
				'PAYMENT_RECEIVED',
				'BID_PLACED',
				'BID_ACCEPTED',
			].includes(type) &&
			job
		) {
			const { grower, applicator, fieldWorker } = job;
			if (userId === job.applicatorId && (grower || fieldWorker)) {
				if (
					notif.type === 'PILOT_JOB_ACCEPTED' ||
					notif.type === 'PILOT_JOB_REJECTED' ||
					notif.type === 'JOB_COMPLETED'
				) {
					filteredJob = {
						id: job.id,
						title: job.title,
						workerId: fieldWorker?.id,
						workerFirstName: fieldWorker?.firstName,
						workerLastName: fieldWorker?.lastName,
					};
				} else {
					filteredJob = {
						id: job.id,
						title: job.title,
						growerId: grower?.id,
						growerFirstName: grower?.firstName,
						growerLastName: grower?.lastName,
					};
				}
			} else if (
				userId === job.growerId ||
				userId === job.fieldWorkerId
			) {
				if (notif.type === 'BID_PLACED') {
					filteredJob = {
						id: job.id,
						bidId: notif.bidId,
						title: job.title,
						applicatorId: notif?.bid?.applicator?.id,
						applicatorFirstName: notif?.bid?.applicator?.firstName,
						applicatorLastName: notif?.bid?.applicator?.lastName,
					};
				} else {
					filteredJob = {
						id: job.id,
						title: job.title,
						applicatorId: applicator?.id,
						applicatorFirstName: applicator?.firstName,
						applicatorLastName: applicator?.lastName,
					};
				}
			}
		}

		if (['TICKET_ASSIGNED', 'TICKET_RESOLVED'].includes(type) && ticket) {
			filteredTicket = {
				id: ticket.id,
				subject: ticket.subject,
				status: ticket.status,
				description: ticket.description,
			};
		}

		return {
			...notif,
			invite: filteredInvite,
			job: filteredJob,
			ticket: filteredTicket,
			bid: undefined,
			workerInvite: undefined,
		};
	});

	return {
		result: formattedNotifications,
		page,
		limit,
		totalPages: Math.ceil(totalResults / limit),
		totalResults,
	};
};

export default {
	getAllNotificationsByUserId,
};
