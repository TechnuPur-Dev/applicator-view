import httpStatus from 'http-status';
import { Prisma } from '@prisma/client';
// import sharp from 'sharp';
// import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../../../../shared/libs/prisma-client';

import {  TicketCategory, TicketPriority, TicketStatus } from '@prisma/client';
import ApiError from '../../../../../shared/utils/api-error';
import { CreateSupportTicket } from './support-ticket-types';


const getAllTicketCategories = async () => {
	try {
		
		const ticketCategoryList = Object.values(TicketCategory).map((category, index) => ({
			id: index + 1,
			name: category,
		}));
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
		const ticketStatusList = Object.values(TicketStatus).map((status, index) => ({
			id: index + 1,
			name: status,
		}));
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
		const ticketPriorityList = Object.values(TicketPriority).map((priority, index) => ({
			id: index + 1,
			name: priority,
		}));
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

const createSupportTicket = async (userId: number, data: CreateSupportTicket) => {
	try {
		const ticket = await prisma.supportTicket.create({
			data: {
				subject: data.subject,
				description: data.description || "", 
				status: data.status || "OPEN",
				assigneeId: data.assigneeId,
				jobId: data.jobId ,
				category: data.category,
				priority: data.priority || "MEDIUM", // Default priority
				createdById: userId, // Assign the user ID
			},
		});

		return ticket;
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError) {
			// Handle Prisma-specific error codes
			if (error.code === 'P2003') {
				throw new ApiError(
					httpStatus.BAD_REQUEST,
					'Foreign key constraint violated. non-existent jobId.',
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
		const tickets = await prisma.supportTicket.findMany()
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

const getSupportTicketById = async (Id:number) => {
	try {
		const tickets = await prisma.supportTicket.findUnique({
			where:{
				id:Id
			}
		})
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
export default {
	
	getAllTicketCategories,
	getAllTicketStatuses,
	getAllTicketPriorities,
	createSupportTicket,
	getAllSupportTicket,
	getSupportTicketById
	
};
