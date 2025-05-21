import { Request, Response } from 'express';
import catchAsync from '../../../../../shared/utils/catch-async';
import httpStatus from 'http-status';
import integrationService from './integration-service';
// import pick from '../../../../../shared/utils/pick';

const inviteUrl = catchAsync(async (req: Request, res: Response) => {
	const result = await integrationService.inviteUrl();
	res.status(httpStatus.OK).json(result);
});
const bindDevices = catchAsync(async (req: Request, res: Response) => {
	const data = req.body;
	const result = await integrationService.bindDevices(data);
	res.status(httpStatus.OK).json(result);
});
const devicesPage = catchAsync(async (req: Request, res: Response) => {
	const data = req.body;
	const result = await integrationService.devicesPage(data);
	res.status(httpStatus.OK).json(result);
});
const worksPage = catchAsync(async (req: Request, res: Response) => {
	const data = req.body;
	const result = await integrationService.worksPage(data);
	res.status(httpStatus.OK).json(result);
});
const workReport = catchAsync(async (req: Request, res: Response) => {
	const data = req.body;
	const result = await integrationService.workReport(data);
	res.status(httpStatus.OK).json(result);
});

export default {
	inviteUrl,
	bindDevices,
	devicesPage,
	worksPage,
	workReport,
};
