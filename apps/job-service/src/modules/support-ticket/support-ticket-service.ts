// import httpStatus from 'http-status';
// import { Prisma } from '@prisma/client';
// import sharp from 'sharp';
// import { v4 as uuidv4 } from 'uuid';
import {prisma} from '../../../../../shared/libs/prisma-client'
import { TicketCategory, TicketPriority, TicketStatus } from '@prisma/client';
// import ApiError from '../../../../../shared/utils/api-error';
import { CreateSupportTicket } from './support-ticket-types';

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
	userId: number,
	data: CreateSupportTicket,
) => {
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

const getAllSupportTicket = async () => {
	const tickets = await prisma.supportTicket.findMany({
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
	return tickets;
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
	ticketId: number,
	data: {
		status: TicketStatus;
		priority?: TicketPriority;
		assigneeId?: number;
	},
) => {
	const ticket = await prisma.supportTicket.update({
		where: { id: ticketId },
		data: {
			...data,

			// This ensures only the provided field is updated
		},
	});

	return ticket;
};

const getMySupportTicket = async (Id: number) => {
	const tickets = await prisma.supportTicket.findMany({
		where: {
			createdById: Id,
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
	return tickets;
};
const getPilotSupportTicket = async (applicatorId: number) => {
	const workers = await prisma.user.findMany({
		where: {
			// applicatorId, //get the pilots/operator created by or associated by applicator
			role: 'WORKER',
		},
	});
	const workerIds = workers.map((worker) => worker.id);
	console.log(workerIds, 'workers');

	// Fetch tickets where createdById matches any of the worker IDs
	const tickets = await prisma.supportTicket.findMany({
		where: {
			createdById: {
				in: workerIds, // use in operator of Prisma that is used to get multiple matching record of workerIds from list
			},
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
	return { tickets };
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
};
