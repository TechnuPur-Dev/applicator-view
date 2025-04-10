// import httpStatus from 'http-status';
// import { Prisma } from '@prisma/client';
// import sharp from 'sharp';
// import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../../../../shared/libs/prisma-client';
import { TicketCategory, TicketPriority, TicketStatus } from '@prisma/client';
import ApiError from '../../../../../shared/utils/api-error';
import { CreateSupportTicket } from './support-ticket-types';
import { PaginateOptions, User } from '../../../../../shared/types/global';

const getAllTicketCategories = async () => {
	const ticketCategoryList = Object.values(TicketCategory).map(
		(category, index) => ({
			id: index + 1,
			name: category,
		}),
	);
	return ticketCategoryList;
};

const getAllTicketStatuses = async () => {
	const ticketStatusList = Object.values(TicketStatus).map(
		(status, index) => ({
			id: index + 1,
			name: status,
		}),
	);
	return ticketStatusList;
};
const getAllTicketPriorities = async () => {
	const ticketPriorityList = Object.values(TicketPriority).map(
		(priority, index) => ({
			id: index + 1,
			name: priority,
		}),
	);
	return ticketPriorityList;
};

const createSupportTicket = async (
	user: User,
	userId: number,
	data: CreateSupportTicket,
) => {
	const userRole = user?.role;

	if (data.assigneeId) {
		const assigneeUser = await prisma.user.findUnique({
			where: { id: data.assigneeId },
			select: { role: true },
		});

		const assigneeRole = assigneeUser?.role;
		const isValid =
			(userRole === 'APPLICATOR' && assigneeRole === 'GROWER') ||
			(userRole === 'WORKER' && assigneeRole === 'APPLICATOR');

		if (!isValid) {
			throw new Error('You are not authorized to create this ticket.');
		}
	}
	if (!data.assigneeId) {
		const isValid =
			(!data.assigneeId && userRole === 'APPLICATOR') ||
			userRole === 'GROWER';
		if (!isValid) {
			throw new Error('You are not authorized to create this ticket.');
		}
	}

	const ticket = await prisma.supportTicket.create({
		data: {
			subject: data.subject,
			description: data.description || '',
			status: data.status || 'OPEN',
			assigneeId: data.assigneeId,
			jobId: data.jobId,
			category: data.category,
			priority: data.priority || 'MEDIUM', // Default priority
			createdById: userId, // Assign the user ID
		},
	});

	return ticket;
};

const getAllSupportTicket = async (user: User, options: PaginateOptions) => {
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

	const tickets = await prisma.supportTicket.findMany({
		where: {
			OR: [{ createdById: user.id }, { assigneeId: user.id }],
		},
		include: {
			createdByUser: {
				select: {
					id: true,
					fullName: true,
					role: true,
				}, // Get only the fullname of the createdByUser/submiited by user
			},
			assigneeUser: {
				select: {
					id: true,
					fullName: true,
					role: true,
				}, // Get only the fullname of the assigneeUser
			},
		},
		omit: {
			createdById: true,
			assigneeId: true,
		},
		skip,
		take: limit,
		orderBy: {
			id: 'desc',
		},
	});
	// Calculate the total number of pages based on the total results and limit
	const totalResults = await prisma.supportTicket.count({
		where: {
			OR: [{ createdById: user.id }, { assigneeId: user.id }],
		},
	});

	const totalPages = Math.ceil(totalResults / limit);
	// Return the paginated result including users, current page, limit, total pages, and total results
	return {
		result: tickets,
		page,
		limit,
		totalPages,
		totalResults,
	};
};

const getSupportTicketById = async (Id: number) => {
	const ticket = await prisma.supportTicket.findUnique({
		where: {
			id: Id,
		},
		include: {
			createdByUser: {
				select: {
					id: true,
					fullName: true,
					role: true,
				}, // Get only the fullname of the createdByUser/submiited by user
			},
			assigneeUser: {
				select: {
					id: true,
					fullName: true,
					role: true,
				}, // Get only the fullname of the assigneeUser
			},
		},
		omit: {
			createdById: true,
			assigneeId: true,
		},
	});
	return ticket;
};
const updateSupportTicket = async (
	user: User,
	ticketId: number,
	data: {
		status: TicketStatus;
		priority?: TicketPriority;
		assigneeId?: number;
	},
) => {
	const userRole = user?.role;

	if (data.assigneeId) {
		const assigneeUser = await prisma.user.findUnique({
			where: { id: data.assigneeId },
			select: { role: true },
		});

		const assigneeRole = assigneeUser?.role;
		const isValid =
			(userRole === 'APPLICATOR' && assigneeRole === 'GROWER') ||
			(userRole === 'WORKER' && assigneeRole === 'APPLICATOR');

		if (!isValid) {
			throw new Error('You are not authorized to create this ticket.');
		}
	}
	if (!data.assigneeId) {
		const isValid =
			(!data.assigneeId && userRole === 'APPLICATOR') ||
			userRole === 'GROWER';
		if (!isValid) {
			throw new Error('You are not authorized to create this ticket.');
		}
	}

	const ticket = await prisma.supportTicket.update({
		where: { id: ticketId },
		data: {
			...data,

			// This ensures only the provided field is updated
		},
	});

	return ticket;
};

const getMySupportTicket = async (userId: number, options: PaginateOptions) => {
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

	const tickets = await prisma.supportTicket.findMany({
		where: {
			createdById: userId,
		},
		include: {
			createdByUser: {
				select: {
					id: true,
					fullName: true,
					role: true,
				}, // Get only the fullname of the createdByUser/submiited by user
			},
			assigneeUser: {
				select: {
					id: true,
					fullName: true,
					role: true,
				}, // Get only the fullname of the assigneeUser
			},
		},
		omit: {
			createdById: true,
			assigneeId: true,
		},
		skip,
		take: limit,
		orderBy: {
			id: 'desc',
		},
	});
	const totalResults = await prisma.supportTicket.count({
		where: {
			createdById: userId,
		},
	});

	const totalPages = Math.ceil(totalResults / limit);
	// Return the paginated result including users, current page, limit, total pages, and total results
	return {
		result: tickets,
		page,
		limit,
		totalPages,
		totalResults,
	};
};
const getPilotSupportTicket = async (
	applicatorId: number,
	options: PaginateOptions,
) => {
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

	// const workers = await prisma.applicatorWorker.findMany({
	// 	where: {
	// 		applicatorId, //get the pilots/operator created by or associated by applicator
	// 	},
	// 	select: {
	// 		worker: true,
	// 	},
	// });
	// const workerIds = workers.map((item) => item.worker.id);

	// Fetch tickets where createdById matches any of the worker IDs
	const tickets = await prisma.supportTicket.findMany({
		where: {
			assigneeId: applicatorId,
			// createdById: {
			// 	in: workerIds, // use in operator of Prisma that is used to get multiple matching record of workerIds from list
			// },
		},
		include: {
			createdByUser: {
				select: {
					id: true,
					fullName: true,
					role: true,
				}, // Get only the fullname of the createdByUser/submiited by user
			},
			assigneeUser: {
				select: {
					id: true,
					fullName: true,
					role: true,
				}, // Get only the fullname of the assigneeUser
			},
		},
		omit: {
			createdById: true,
			assigneeId: true,
		},
		skip,
		take: limit,
		orderBy: {
			id: 'desc',
		},
	});
	const totalResults = await prisma.supportTicket.count({
		where: {
			assigneeId: applicatorId,
			// createdById: {
			// 	in: workerIds, // use in operator of Prisma that is used to get multiple matching record of workerIds from list
			// },
		},
	});

	const totalPages = Math.ceil(totalResults / limit);
	// Return the paginated result including users, current page, limit, total pages, and total results
	return {
		result: tickets,
		page,
		limit,
		totalPages,
		totalResults,
	};
};
// Get job list by applicator with filters
const getAllJobsByApplicator = async (applicatorId: number) => {
	// Fetch jobs
	const jobs = await prisma.job.findMany({
		where: {
			applicatorId,
			status: {
				in: ['READY_TO_SPRAY'],
			},
		},
		select: {
			id: true,
			title: true,
		},
	});

	// Calculate total acres for each job

	return jobs;
};
const deleteTicket = async (userId: number, ticketId: number) => {
	await prisma.supportTicket.delete({
		where: {
			id: ticketId,
			createdById: userId,
		},
	});

	return {
		message: 'Support Ticket deleted successfully.',
	};
};
const resolveSupportTicket = async (
	user: User,
	ticketId: number,
	data: {
		status: TicketStatus;
	},
) => {
	const ticket = await prisma.supportTicket.findUnique({
		where: { id: ticketId },
		include: { createdByUser: true },
	});
	if (!ticket) {
		throw new ApiError(httpStatus.NOT_FOUND, 'Ticket not found.');
	}

	const userRole = user?.role;
	const targetRole = ticket?.createdByUser?.role;
	console.log(userRole, targetRole);

	const isValid =
		(userRole === 'GROWER' && targetRole === 'APPLICATOR') ||
		(userRole === 'APPLICATOR' && targetRole === 'WORKER');

	if (!isValid) {
		throw new Error('You are not authorized to resolve this ticket.');
	}
	const result = await prisma.$transaction(async (tx) => {
		const updatedTicket = await tx.supportTicket.update({
			where: { id: ticketId },
			data: {
				status: data.status,
			},
		});
		await tx.supportTicketActivity.create({
			data: {
				ticketId: ticket.id,
				updatedById: user.id,// User who changed the status (Applicator, Pilot, or Grower) logged in user
				oldStatus: ticket?.status,
				newStatus: data.status,
				reason: null,
			},
		});

		return updatedTicket;
	});

	return result;
	// return prisma.supportTicket.update({
	// 	where: { id: ticketId },
	// 	data: {
	// 		status: data.status,
	// 	},
	// });
};
const assignSupportTicket = async (
	user: User,
	ticketId: number,
	data: {
		assigneeId?: number;
	},
) => {
	const ticket = await prisma.supportTicket.findUnique({
		where: { id: ticketId },
		include: { createdByUser: true },
	});

	const userRole = user?.role;
	const targetRole = ticket?.createdByUser?.role;

	const isValid = userRole === 'APPLICATOR' && targetRole === 'WORKER';

	if (!isValid) {
		throw new Error('You are not authorized to assign this ticket.');
	}

	return prisma.supportTicket.update({
		where: { id: ticketId },
		data: {
			assigneeId: data.assigneeId,
			status: 'IN_PROGRESS',
		},
	});
};
export default {
	getAllTicketCategories,
	getAllTicketStatuses,
	getAllTicketPriorities,
	createSupportTicket,
	getAllSupportTicket,
	getSupportTicketById,
	updateSupportTicket,
	getMySupportTicket,
	getPilotSupportTicket,
	getAllJobsByApplicator,
	deleteTicket,
	resolveSupportTicket,
	assignSupportTicket,
};
