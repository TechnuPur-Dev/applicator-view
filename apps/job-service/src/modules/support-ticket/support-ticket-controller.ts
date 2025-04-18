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
	const user = req.user;
	const Id = req.payload.id;
	const data = req.body;
	const ticketData = await supportTicketService.createSupportTicket(
		user,
		Id,
		data,
	);
	res.status(httpStatus.OK).json({
		result: ticketData,
		message: 'support ticket created successfully',
	});
});

const getAllSupportTicket = catchAsync(async (req: Request, res: Response) => {
	const options = pick(req.query, [
		'limit',
		'page',
		'label',
		'searchValue',
	]);
	const user = req.user;
	const ticketData = await supportTicketService.getAllSupportTicket(
		user,
		options,
	);
	res.status(httpStatus.OK).json(ticketData);
});

const getSupportTicketById = catchAsync(async (req: Request, res: Response) => {
	const Id = +req.params.ticketId;
	const ticketData = await supportTicketService.getSupportTicketById(Id);
	res.status(httpStatus.OK).json({ result: ticketData });
});

const updateSupportTicket = catchAsync(async (req: Request, res: Response) => {
	const user = req.user;
	const Id = +req.params.ticketId;
	const data = req.body;
	const ticketData = await supportTicketService.updateSupportTicket(
		user,
		Id,
		data,
	);
	res.status(httpStatus.OK).json({
		message: 'support ticket updated successfully',
		result: ticketData,
	});
});

const getMySupportTicket = catchAsync(async (req: Request, res: Response) => {
	const options = pick(req.query, [
		'limit',
		'page',
		'label',
		'searchValue',
	]);
	const userId = req.payload.id;
	const ticketData = await supportTicketService.getMySupportTicket(
		userId,
		options,
	);
	res.status(httpStatus.OK).json(ticketData);
});
const getPilotSupportTicket = catchAsync(
	async (req: Request, res: Response) => {
		const options = pick(req.query, [
			'limit',
			'page',
			'label',
			'searchValue',
		]);
		const userId = req.payload.id;
		const ticketData = await supportTicketService.getPilotSupportTicket(
			userId,
			options,
		);
		res.status(httpStatus.OK).json(ticketData);
	},
);
const getAllJobsByApplicator = catchAsync(
	async (req: Request, res: Response) => {
		const user = req.user;
		const applicatorId =Number(req?.query?.applicatorId)
		const result =
			await supportTicketService.getAllJobsByApplicator(user,applicatorId);
		res.status(httpStatus.OK).json({ result });
	},
);
const deleteTicket = catchAsync(async (req: Request, res: Response) => {
	const userId = +req.payload.id;
	const ticketId = +req.params.ticketId;
	const result = await supportTicketService.deleteTicket(userId, ticketId);
	res.status(httpStatus.OK).json(result);
});
const resolveSupportTicket = catchAsync(async (req: Request, res: Response) => {
	const Id = +req.params.ticketId;
	const user = req.user;
	const data = req.body;
	const ticketData = await supportTicketService.resolveSupportTicket(
		user,
		Id,
		data,
	);
	res.status(httpStatus.OK).json({
		result: ticketData,
		message: 'Support ticket resolved successfully',
	});
});
// const assignSupportTicket = catchAsync(async (req: Request, res: Response) => {
// 	const Id = +req.params.ticketId;
// 	const user = req.user;
// 	const data = req.body;
// 	const ticketData = await supportTicketService.assignSupportTicket(
// 		user,
// 		Id,
// 		data,
// 	);
// 	res.status(httpStatus.OK).json({
// 		result: ticketData,
// 		message: 'Support ticket assigned successfully',
// 	});
// });
const getSupportTicketActivityById = catchAsync(
	async (req: Request, res: Response) => {
		const ticketId = +req.params.ticketId;
		// const options = pick(req.query, ['limit', 'page']);
		const result = await supportTicketService.getSupportTicketActivityById(ticketId);
		res.status(httpStatus.OK).json({ result });
	},
);
const getAllSupportTeamTicket = catchAsync(async (req: Request, res: Response) => {
	const options = pick(req.query, [
		'limit',
		'page',
		'label',
		'searchValue',
	]);
	const ticketData = await supportTicketService.getAllSupportTeamTicket(
		options,
	);
	res.status(httpStatus.OK).json(ticketData);
});
const updateBySupportTeam = catchAsync(async (req: Request, res: Response) => {
	const user = req.user;
	const Id = +req.params.ticketId;
	const data = req.body;
	const ticketData = await supportTicketService.updateBySupportTeam(
		user,
		Id,
		data,
	);
	res.status(httpStatus.OK).json({
		message: 'support ticket updated successfully',
		result: ticketData,
	});
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
	deleteTicket,
	resolveSupportTicket,
	// assignSupportTicket,
	getSupportTicketActivityById,
	getAllSupportTeamTicket,
	updateBySupportTeam
};
