import httpStatus from 'http-status';
import { Prisma } from '@prisma/client';
// import sharp from 'sharp';
// import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../../../../shared/libs/prisma-client';

import { TicketCategory, TicketPriority, TicketStatus } from '@prisma/client';
import ApiError from '../../../../../shared/utils/api-error';
import { CreateSupportTicket } from './support-ticket-types';

const getAllTicketCategories = async () => {
	try {
		const ticketCategoryList = Object.values(TicketCategory).map(
			(category, index) => ({
				id: index + 1,
				name: category,
			}),
		);
		return ticketCategoryList;
	} catch (error) {
		if (error instanceof Error) {
			// Handle generic errors
			throw new ApiError(
				httpStatus.CONFLICT,
				'Error while retreiving list.',
			);
		}
	}
};

const getAllTicketStatuses = async () => {
	try {
		const ticketStatusList = Object.values(TicketStatus).map(
			(status, index) => ({
				id: index + 1,
				name: status,
			}),
		);
		return ticketStatusList;
	} catch (error) {
		if (error instanceof Error) {
			// Handle generic errors
			throw new ApiError(
				httpStatus.CONFLICT,
				'Error while retreiving list.',
			);
		}
	}
};
const getAllTicketPriorities = async () => {
	try {
		const ticketPriorityList = Object.values(TicketPriority).map(
			(priority, index) => ({
				id: index + 1,
				name: priority,
			}),
		);
		return ticketPriorityList;
	} catch (error) {
		if (error instanceof Error) {
			// Handle generic errors
			throw new ApiError(
				httpStatus.CONFLICT,
				'Error while retreiving list.',
			);
		}
	}
};

const createSupportTicket = async (
	userId: number,
	data: CreateSupportTicket,
) => {
	try {
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
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError) {
			// Handle Prisma-specific error codes
			if (error.code === 'P2003') {
				console.log(error, 'error');
				throw new ApiError(
					httpStatus.BAD_REQUEST,
					'Foreign key constraint violated. non-existent Id.',
				);
			}
		}
		if (error instanceof Error) {
			// Handle generic errors
			throw new ApiError(httpStatus.CONFLICT, error.message);
		}
	}
};

const getAllSupportTicket = async () => {
	try {
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
	} catch (error) {
		if (error instanceof Error) {
			// Handle generic errors
			throw new ApiError(
				httpStatus.NOT_FOUND,
				'Error while retreiving list.',
			);
		}
	}
};

const getSupportTicketById = async (Id: number) => {
	try {
		const tickets = await prisma.supportTicket.findUnique({
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
		return tickets;
	} catch (error) {
		if (error instanceof Error) {
			// Handle generic errors
			throw new ApiError(
				httpStatus.NOT_FOUND,
				'Error while retreiving support ticket.',
			);
		}
	}
};
const updateSupportTicket = async (
	ticketId: number,
	data: {
		status: TicketStatus;
		priority?: TicketPriority;
		assigneeId?: number;
	},
) => {
	try {
		const ticket = await prisma.supportTicket.update({
			where: { id: ticketId },
			data: {
				...data,

				// This ensures only the provided field is updated
			},
		});

		return ticket;
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError) {
			if (error.code === 'P2025') {
				// No record found
				throw new ApiError(httpStatus.NOT_FOUND, 'Ticket not found.');
			}
			if (error.code === 'P2003') {
				// Foreign key constraint error
				throw new ApiError(
					httpStatus.BAD_REQUEST,
					'Invalid assigneeId. User does not exist.',
				);
			}
		}
		if (error instanceof Error) {
			throw new ApiError(httpStatus.CONFLICT, error.message);
		}
	}
};

const getMySupportTicket = async (Id:number) => {
	try {
		const tickets = await prisma.supportTicket.findMany({
			where:{
               createdById:Id
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
	} catch (error) {
		if (error instanceof Error) {
			// Handle generic errors
			throw new ApiError(
				httpStatus.NOT_FOUND,
				'Error while retreiving list.',
			);
		}
	}
};
const getPilotSupportTicket = async (applicatorId:number) => {
	try {
			const workers = await prisma.user.findMany({
			where:{
				// applicatorId, //get the pilots/operator created by or associated by applicator
				role:'WORKER'
			},
		})
		const workerIds = workers.map(worker => worker.id);
		console.log(workerIds,"workers")

		// Fetch tickets where createdById matches any of the worker IDs
		const tickets = await prisma.supportTicket.findMany({
			where:{
               createdById:{
				in:workerIds // use in operator of Prisma that is used to get multiple matching record of workerIds from list 
			   }
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
		return {tickets};
	} catch (error) {
		if (error instanceof Error) {
			// Handle generic errors
			throw new ApiError(
				httpStatus.NOT_FOUND,
				'Error while retreiving list.',
			);
		}
	}
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
	getPilotSupportTicket
};
