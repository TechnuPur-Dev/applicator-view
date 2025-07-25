// import httpStatus from 'http-status';
// import { Prisma } from '@prisma/client';
// import sharp from 'sharp';
// import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../../../../shared/libs/prisma-client';
import {
	Prisma,
	TicketCategory,
	TicketPriority,
	TicketStatus,
} from '@prisma/client';
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
			select: {id:true, role: true },
		});

		const assigneeRole = assigneeUser?.role;
		const isValid =
			(userRole === 'GROWER' && assigneeRole === 'APPLICATOR') ||
			(userRole === 'WORKER' && assigneeRole === 'APPLICATOR'); // grower and worker can create ticket for applicator 

		if (!isValid) {
			throw new Error('You are not authorized to create this ticket.');
		}
	}
	if (!data.assigneeId) {
		const isValid =
			(!data.assigneeId && userRole === 'APPLICATOR') ||
			userRole === 'GROWER' || userRole === 'WORKER'; // (appkicator , grower,pilot can create ticket for support team)
		if (!isValid) {
			throw new Error('You are not authorized to create this ticket.');
		}
	}
	const result = await prisma.$transaction(async (prisma) => {
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
	if(data.assigneeId){
		await prisma.notification.create({
			data: {
				userId: data.assigneeId, // Notify the appropriate user
				ticketId:ticket?.id,
				type: 'TICKET_ASSIGNED',
			},
		});
	}

	return ticket;
});
return result
};

const getAllSupportTicket = async (
	user: User,
	options: PaginateOptions & {
		label?: string;
		searchValue?: string;
	},
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
	const filters: Prisma.SupportTicketWhereInput = {
		OR: [{ createdById: user.id }, { assigneeId: user.id }],
	};
	if (options.label && options.searchValue) {
		const searchFilter: Prisma.SupportTicketWhereInput = {};
		const searchValue = options.searchValue;

		switch (options.label) {
			case 'subject':
				searchFilter.subject = {
					contains: searchValue,
					mode: 'insensitive',
				};
				break;

			case 'status':
				searchFilter.status = {
					equals: searchValue as TicketStatus, // Ensure type matches your Prisma enum
				};
				break;
			case 'assigneeId':
				searchFilter.assigneeId = parseInt(searchValue, 10);

				break;

			case 'jobId':
				searchFilter.jobId = parseInt(searchValue, 10);

				break;
			case 'category':
				searchFilter.category = {
					equals: searchValue as TicketCategory, // Ensure type matches your Prisma enum
				};
				break;
			case 'priority':
				searchFilter.priority = {
					equals: searchValue as TicketPriority, // Ensure type matches your Prisma enum
				};
				break;

			case 'assigneeUser':
				searchFilter.assigneeUser = {
					OR: [
						{
							fullName: {
								contains: searchValue,
								mode: 'insensitive',
							},
						},
						{
							firstName: {
								contains: searchValue,
								mode: 'insensitive',
							},
						},
						{
							lastName: {
								contains: searchValue,
								mode: 'insensitive',
							},
						},
					],
				};
				break;
			case 'createdByUser':
				searchFilter.createdByUser = {
					OR: [
						{
							fullName: {
								contains: searchValue,
								mode: 'insensitive',
							},
						},
						{
							firstName: {
								contains: searchValue,
								mode: 'insensitive',
							},
						},
						{
							lastName: {
								contains: searchValue,
								mode: 'insensitive',
							},
						},
					],
				};
				break;
			default:
				throw new Error('Invalid label provided.');
		}

		Object.assign(filters, searchFilter); // Merge filters dynamically
	}
	const tickets = await prisma.supportTicket.findMany({
		where: filters,
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
		where: filters,
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
		// assigneeId?: number;
	},
) => {

	const ticket = await prisma.supportTicket.findUnique({
		where: { id: ticketId },
		select: { id: true, status: true, createdById: true, assigneeId: true },
	});

	if (!ticket) {
		throw new Error("Ticket not found.");
	}
	const currentStatus = ticket.status;

	// Define allowed status transitions
	const isValidTransition =
		(data.status === 'IN_PROGRESS' && currentStatus === 'OPEN') ||
		(data.status === 'CLOSED' && (currentStatus === 'OPEN' || currentStatus === 'RESOLVED'))


	if (!isValidTransition) {
		throw new Error(`You cannot change status from ${currentStatus} to ${data.status}.`);
	}
	// Role-based check
	if (data.status === 'IN_PROGRESS' && user.id !== ticket.assigneeId) {
		throw new Error('Only the assigned user can move the ticket to IN_PROGRESS.');
	}

	if (data.status === 'CLOSED' && user.id !== ticket.createdById) {
		throw new Error('Only the ticket creator can close the ticket.');
	}
	const result = await prisma.$transaction(async (tx) => {
		const updateTicket = await tx.supportTicket.update({
			where: { id: ticketId },
			data: {
				...data,

				// This ensures only the provided field is updated
			},
		});
		await tx.supportTicketActivity.create({
			data: {
				ticketId: ticket.id,
				updatedById: user.id, // User who changed the status (Applicator, Pilot, or Grower) logged in user
				oldStatus: ticket?.status,
				newStatus: data.status,
				reason: null,
			},
		});
		return updateTicket;
	});
	return result
};

const getMySupportTicket = async (
	userId: number,
	options: PaginateOptions & {
		label?: string;
		searchValue?: string;
	},
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
	const filters: Prisma.SupportTicketWhereInput = {
		createdById: userId,
	};
	if (options.label && options.searchValue) {
		const searchFilter: Prisma.SupportTicketWhereInput = {};
		const searchValue = options.searchValue;

		switch (options.label) {
			case 'subject':
				searchFilter.subject = {
					contains: searchValue,
					mode: 'insensitive',
				};
				break;

			case 'status':
				searchFilter.status = {
					equals: searchValue as TicketStatus, // Ensure type matches your Prisma enum
				};
				break;
			case 'assigneeId':
				searchFilter.assigneeId = parseInt(searchValue, 10);

				break;

			case 'jobId':
				searchFilter.jobId = parseInt(searchValue, 10);

				break;
			case 'category':
				searchFilter.category = {
					equals: searchValue as TicketCategory, // Ensure type matches your Prisma enum
				};
				break;
			case 'priority':
				searchFilter.priority = {
					equals: searchValue as TicketPriority, // Ensure type matches your Prisma enum
				};
				break;

			case 'assigneeUser':
				searchFilter.assigneeUser = {
					OR: [
						{
							fullName: {
								contains: searchValue,
								mode: 'insensitive',
							},
						},
						{
							firstName: {
								contains: searchValue,
								mode: 'insensitive',
							},
						},
						{
							lastName: {
								contains: searchValue,
								mode: 'insensitive',
							},
						},
					],
				};
				break;
			case 'createdByUser':
				searchFilter.createdByUser = {
					OR: [
						{
							fullName: {
								contains: searchValue,
								mode: 'insensitive',
							},
						},
						{
							firstName: {
								contains: searchValue,
								mode: 'insensitive',
							},
						},
						{
							lastName: {
								contains: searchValue,
								mode: 'insensitive',
							},
						},
					],
				};
				break;
			default:
				throw new Error('Invalid label provided.');
		}

		Object.assign(filters, searchFilter); // Merge filters dynamically
	}
	const tickets = await prisma.supportTicket.findMany({
		where: filters,
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
		where: filters,
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
	options: PaginateOptions & {
		label?: string;
		searchValue?: string;
	},
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
	const filters: Prisma.SupportTicketWhereInput = {
		assigneeId: applicatorId,
	};
	if (options.label && options.searchValue) {
		const searchFilter: Prisma.SupportTicketWhereInput = {};
		const searchValue = options.searchValue;

		switch (options.label) {
			case 'subject':
				searchFilter.subject = {
					contains: searchValue,
					mode: 'insensitive',
				};
				break;

			case 'status':
				searchFilter.status = {
					equals: searchValue as TicketStatus, // Ensure type matches your Prisma enum
				};
				break;
			case 'assigneeId':
				searchFilter.assigneeId = parseInt(searchValue, 10);

				break;

			case 'jobId':
				searchFilter.jobId = parseInt(searchValue, 10);

				break;
			case 'category':
				searchFilter.category = {
					equals: searchValue as TicketCategory, // Ensure type matches your Prisma enum
				};
				break;
			case 'priority':
				searchFilter.priority = {
					equals: searchValue as TicketPriority, // Ensure type matches your Prisma enum
				};
				break;

			case 'assigneeUser':
				searchFilter.assigneeUser = {
					OR: [
						{
							fullName: {
								contains: searchValue,
								mode: 'insensitive',
							},
						},
						{
							firstName: {
								contains: searchValue,
								mode: 'insensitive',
							},
						},
						{
							lastName: {
								contains: searchValue,
								mode: 'insensitive',
							},
						},
					],
				};
				break;
			case 'createdByUser':
				searchFilter.createdByUser = {
					OR: [
						{
							fullName: {
								contains: searchValue,
								mode: 'insensitive',
							},
						},
						{
							firstName: {
								contains: searchValue,
								mode: 'insensitive',
							},
						},
						{
							lastName: {
								contains: searchValue,
								mode: 'insensitive',
							},
						},
					],
				};
				break;
			default:
				throw new Error('Invalid label provided.');
		}

		Object.assign(filters, searchFilter); // Merge filters dynamically
	}
	const tickets = await prisma.supportTicket.findMany({
		where: filters,
		//  {
		// assigneeId: applicatorId,
		// createdById: {
		// 	in: workerIds, // use in operator of Prisma that is used to get multiple matching record of workerIds from list
		// },
		// },
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
		where: filters,
		// {
		// 	assigneeId: applicatorId,
		// createdById: {
		// 	in: workerIds, // use in operator of Prisma that is used to get multiple matching record of workerIds from list
		// },
		// },
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
const getAllJobsByApplicator = async (currentUser: User, applicatorId: number) => {
	const whereCondition: Prisma.JobWhereInput = {};

	if (currentUser.role === 'APPLICATOR') {
		whereCondition.applicatorId = currentUser.id;
		whereCondition.status = { in: ['READY_TO_SPRAY'] };

	}

	if (currentUser.role === 'GROWER') {
		whereCondition.growerId = currentUser.id;
		whereCondition.status = { in: ['READY_TO_SPRAY'] };
		if (applicatorId) {
			whereCondition.applicatorId = applicatorId;
		}
	} else if (currentUser.role === 'WORKER') {
		whereCondition.fieldWorkerId = currentUser.id;
		whereCondition.status = { in: ['ASSIGNED_TO_PILOT'] };
		if (applicatorId) {
			whereCondition.applicatorId = applicatorId;
		}
	}

	console.log(whereCondition, 'where');

	const jobs = await prisma.job.findMany({
		where: whereCondition,
		select: {
			id: true,
			title: true,
		},
	});

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
		include: { createdByUser: true, },
	});
	if (!ticket) {
		throw new ApiError(httpStatus.NOT_FOUND, 'Ticket not found.');
	}

	const userRole = user?.role;
	const targetRole = ticket?.createdByUser?.role;
	console.log(userRole, targetRole);

	const isValid =
		(userRole === 'APPLICATOR' && targetRole === 'GROWER') ||
		(userRole === 'APPLICATOR' && targetRole === 'WORKER');

	if (!isValid) {
		throw new Error('You are not authorized to resolve this ticket.');
	}
	if (data.status === 'RESOLVED' && user.id !== ticket.assigneeId) {
		throw new Error('Only the assigned user can move the ticket to RESOLVED.');
	}
	const result = await prisma.$transaction(async (tx) => {
		const updatedTicket = await tx.supportTicket.update({
			where: { id: ticketId },
			data: {
				status: data.status,
			},
		});
		await prisma.notification.create({
			data: {
				userId:ticket.createdByUser.id, // Notify the appropriate user
				type: 'TICKET_RESOLVED',
			},
		});
		await tx.supportTicketActivity.create({
			data: {
				ticketId: ticket.id,
				updatedById: user.id, // User who changed the status (Applicator, Pilot, or Grower) logged in user
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
// const assignSupportTicket = async (
// 	user: User,
// 	ticketId: number,
// 	data: {
// 		assigneeId?: number;
// 	},
// ) => {
// 	const ticket = await prisma.supportTicket.findUnique({
// 		where: { id: ticketId },
// 		include: { createdByUser: true },
// 	});

// 	const userRole = user?.role;
// 	const targetRole = ticket?.createdByUser?.role;

// 	const isValid = userRole === 'APPLICATOR' && targetRole === 'WORKER';

// 	if (!isValid) {
// 		throw new Error('You are not authorized to assign this ticket.');
// 	}

// 	return prisma.supportTicket.update({
// 		where: { id: ticketId },
// 		data: {
// 			assigneeId: data.assigneeId,
// 			status: 'IN_PROGRESS',
// 		},
// 	});
// };

const getSupportTicketActivityById = async (
	ticketId: number,
	// options: PaginateOptions,
) => {
	const supportActivities = await prisma.supportTicketActivity.findMany({
		where: {
			ticketId,
		},
		select: {
			createdAt: true,
			oldStatus: true,
			newStatus: true,
			reason: true,
			updatedBy: {
				select: {
					fullName: true,
				},
			},
		},
		orderBy: {
			id: 'desc',
		},
	});

	return supportActivities.map(({ updatedBy, ...activity }) => ({
		...activity,
		updatedBy: updatedBy?.fullName || null,
	}));
};
const getAllSupportTeamTicket = async (
	options: PaginateOptions & {
		label?: string;
		searchValue?: string;
	},
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
	const filters: Prisma.SupportTicketWhereInput = {
		assigneeId:null
	};
	if (options.label && options.searchValue) {
		const searchFilter: Prisma.SupportTicketWhereInput = {};
		const searchValue = options.searchValue;

		switch (options.label) {
			case 'subject':
				searchFilter.subject = {
					contains: searchValue,
					mode: 'insensitive',
				};
				break;

			case 'status':
				searchFilter.status = {
					equals: searchValue as TicketStatus, // Ensure type matches your Prisma enum
				};
				break;
			case 'assigneeId':
				searchFilter.assigneeId = parseInt(searchValue, 10);

				break;

			case 'jobId':
				searchFilter.jobId = parseInt(searchValue, 10);

				break;
			case 'category':
				searchFilter.category = {
					equals: searchValue as TicketCategory, // Ensure type matches your Prisma enum
				};
				break;
			case 'priority':
				searchFilter.priority = {
					equals: searchValue as TicketPriority, // Ensure type matches your Prisma enum
				};
				break;

			case 'assigneeUser':
				searchFilter.assigneeUser = {
					OR: [
						{
							fullName: {
								contains: searchValue,
								mode: 'insensitive',
							},
						},
						{
							firstName: {
								contains: searchValue,
								mode: 'insensitive',
							},
						},
						{
							lastName: {
								contains: searchValue,
								mode: 'insensitive',
							},
						},
					],
				};
				break;
			case 'createdByUser':
				searchFilter.createdByUser = {
					OR: [
						{
							fullName: {
								contains: searchValue,
								mode: 'insensitive',
							},
						},
						{
							firstName: {
								contains: searchValue,
								mode: 'insensitive',
							},
						},
						{
							lastName: {
								contains: searchValue,
								mode: 'insensitive',
							},
						},
					],
				};
				break;
			default:
				throw new Error('Invalid label provided.');
		}

		Object.assign(filters, searchFilter); // Merge filters dynamically
	}
	const tickets = await prisma.supportTicket.findMany({
		where: filters,
		include: {
			createdByUser: {
				select: {
					id: true,
					fullName: true,
					role: true,
				}, // Get only the fullname of the createdByUser/submiited by user
			},
			
		},
		omit: {
			createdById: true,
		},
		skip,
		take: limit,
		orderBy: {
			id: 'desc',
		},
	});
	// Calculate the total number of pages based on the total results and limit
	const totalResults = await prisma.supportTicket.count({
		where: filters,
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
const updateBySupportTeam = async (
	user: User,
	ticketId: number,
	data: {
		status: TicketStatus;
		priority?: TicketPriority;
		// assigneeId?: number;
	},
) => {

	const ticket = await prisma.supportTicket.findUnique({
		where: { id: ticketId },
		select: { id: true, status: true, createdById: true, assigneeId: true },
	});

	if (!ticket) {
		throw new Error("Ticket not found.");
	}
	const currentStatus = ticket.status;

	// Define allowed status transitions
	const isValidTransition =
		(data.status === 'IN_PROGRESS' && currentStatus === 'OPEN') ||
		(data.status === 'RESOLVED' && (currentStatus === 'OPEN' || currentStatus === 'IN_PROGRESS'))


	if (!isValidTransition) {
		throw new Error(`You cannot change status from ${currentStatus} to ${data.status}.`);
	}

	const result = await prisma.$transaction(async (tx) => {
		const updateTicket = await tx.supportTicket.update({
			where: { id: ticketId },
			data: {
				...data,

				// This ensures only the provided field is updated
			},
		});
		if(data.status === 'RESOLVED'){
            await prisma.notification.create({
				data: {
					userId:ticket.createdById, // Notify the appropriate user
					type: 'TICKET_RESOLVED',
				},
			});
		}
		
		await tx.supportTicketActivity.create({
			data: {
				ticketId: ticket.id,
				updatedById: user.id, // User who changed the status (Applicator, Pilot, or Grower) logged in user
				oldStatus: ticket?.status,
				newStatus: data.status,
				reason: null,
			},
		});
		return updateTicket;
	});
	return result
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
	// assignSupportTicket,
	getSupportTicketActivityById,
	getAllSupportTeamTicket,
	updateBySupportTeam
};
