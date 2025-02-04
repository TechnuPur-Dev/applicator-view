import { Request, Response } from 'express';
import catchAsync from '../../../../../shared/utils/catch-async';
import httpStatus from 'http-status';
import supportTicketService from './support-ticket-service';


const getAllTicketCategories = catchAsync(async (req: Request, res: Response) => {
	const ticketData = await supportTicketService.getAllTicketCategories();
	res.status(httpStatus.OK).json({ result: ticketData });
});

const getAllTicketStatuses = catchAsync(async (req: Request, res: Response) => {
	const ticketData = await supportTicketService.getAllTicketStatuses();
	res.status(httpStatus.OK).json({ result: ticketData });
});

const getAllTicketPriorities = catchAsync(async (req: Request, res: Response) => {
	const ticketData = await supportTicketService.getAllTicketPriorities();
	res.status(httpStatus.OK).json({ result: ticketData });
});
export default {
	getAllTicketCategories,
	getAllTicketStatuses,
	getAllTicketPriorities
	
};
