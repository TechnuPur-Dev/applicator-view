import httpStatus from 'http-status';
// import { Prisma } from '@prisma/client';
// import sharp from 'sharp';
// import { v4 as uuidv4 } from 'uuid';
import {  TicketCategory, TicketPriority, TicketStatus } from '@prisma/client';
import ApiError from '../../../../../shared/utils/api-error';


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
export default {
	
	getAllTicketCategories,
	getAllTicketStatuses,
	getAllTicketPriorities
	
};
