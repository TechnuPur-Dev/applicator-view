import { Request, Response } from 'express';
import catchAsync from '../../../../../shared/utils/catch-async';
import httpStatus from 'http-status';
import supportTicketService from './support-ticket-service';
import pick from '../../../../../shared/utils/pick';

const getAllTicketCategories = catchAsync(
	async (req: Request, res: Response) => {
		const ticketData = await supportTicketService.getAllTicketCategories();
		res.status(httpStatus.OK).json({ result: ticketData });
	},
);

const getAllTicketStatuses = catchAsync(async (req: Request, res: Response) => {
	const ticketData = await supportTicketService.getAllTicketStatuses();
	res.status(httpStatus.OK).json({ result: ticketData });
});

const getAllTicketPriorities = catchAsync(
	async (req: Request, res: Response) => {
		const ticketData = await supportTicketService.getAllTicketPriorities();
		res.status(httpStatus.OK).json({ result: ticketData });
	},
);

const createSupportTicket = catchAsync(async (req: Request, res: Response) => {
	const Id = req.payload.id;
	const data = req.body;
	const ticketData = await supportTicketService.createSupportTicket(Id, data);
	res.status(httpStatus.OK).json({
		result: ticketData,
		message: 'support ticket created successfully',
	});
});

const getAllSupportTicket = catchAsync(async (req: Request, res: Response) => {
	const options = pick(req.query, ['limit', 'page']);

	const ticketData = await supportTicketService.getAllSupportTicket(options);
	res.status(httpStatus.OK).json(ticketData);
});

const getSupportTicketById = catchAsync(async (req: Request, res: Response) => {
	const Id = +req.params.ticketId;
	const ticketData = await supportTicketService.getSupportTicketById(Id);
	res.status(httpStatus.OK).json({ result: ticketData });
});

const updateSupportTicket = catchAsync(async (req: Request, res: Response) => {
	const Id = +req.params.ticketId;
	const data = req.body;
	const ticketData = await supportTicketService.updateSupportTicket(Id, data);
	res.status(httpStatus.OK).json({
		message: 'support ticket updated successfully',
		result: ticketData,
	});
});

const getMySupportTicket = catchAsync(async (req: Request, res: Response) => {
	const options = pick(req.query, ['limit', 'page']);
	const Id = req.payload.id;
	const ticketData = await supportTicketService.getMySupportTicket(
		Id,
		options,
	);
	res.status(httpStatus.OK).json(ticketData);
});
const getPilotSupportTicket = catchAsync(
	async (req: Request, res: Response) => {
		const options = pick(req.query, ['limit', 'page']);
		const Id = req.payload.id;
		const ticketData = await supportTicketService.getPilotSupportTicket(
			Id,
			options,
		);
		res.status(httpStatus.OK).json(ticketData);
	},
);
const getAllJobsByApplicator = catchAsync(
	async (req: Request, res: Response) => {
		const userId = +req.payload.id;
		const result =
			await supportTicketService.getAllJobsByApplicator(userId);
		res.status(httpStatus.OK).json({ result });
	},
);
const deleteTicket = catchAsync(async (req: Request, res: Response) => {
	const ticketId = +req.params.ticketId;
	const result = await supportTicketService.deleteTicket(ticketId);
	res.status(httpStatus.OK).json(result);
});
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
	deleteTicket
};
