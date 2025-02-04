import { Request, Response } from 'express';
import catchAsync from '../../../../../shared/utils/catch-async';
import httpStatus from 'http-status';
import supportTicketService from './support-ticket-service';


const getAllJobTypes = catchAsync(async (req: Request, res: Response) => {
	const jobData = await supportTicketService.getAllJobTypes();
	res.status(httpStatus.OK).json({ result: jobData });
});

const getAllJobStatus = catchAsync(async (req: Request, res: Response) => {
	const jobData = await supportTicketService.getAllJobStatus();
	res.status(httpStatus.OK).json({ result: jobData });
});

export default {
	getAllJobTypes,
	getAllJobStatus,
	
};
