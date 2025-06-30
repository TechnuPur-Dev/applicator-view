import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../../../../shared/utils/catch-async';
import viewService from './integration-service';
import { ViewTable } from '@prisma/client';

const getAuthUrl = catchAsync(async (req: Request, res: Response) => {
	const result = await viewService.getAuthUrl();
	res.status(httpStatus.CREATED).json(result);
});

const getAuthTokens = catchAsync(async (req: Request, res: Response) => {
	const code = req.body.code;
	const userId = req.payload.id;
	const userData = await viewService.getAuthTokens(userId, code);
	res.status(httpStatus.OK).json({ result: userData });
});
const getOrganizations = catchAsync(async (req: Request, res: Response) => {
	const userId = req.payload.id;
	const userData = await viewService.getOrganizations(userId);
	res.status(httpStatus.OK).json({ result: userData });
});
export default {
	getAuthUrl,
	getAuthTokens,
	getOrganizations,
};
