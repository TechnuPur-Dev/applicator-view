import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../../../../shared/utils/catch-async';
import viewService from './integration-service';
// import { ViewTable } from '@prisma/client';

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

const getOrganizationsById = catchAsync(async (req: Request, res: Response) => {
	const userId = req.payload.id;
	const organizationId = req.params.orgId;
	const userData = await viewService.getOrganizationsById(userId,organizationId);
	res.status(httpStatus.OK).json({ result: userData });
});
const getOrgAllFarmsByOrgId = catchAsync(async (req: Request, res: Response) => {
	const userId = req.payload.id;
	const organizationId = req.params.orgId;
	const userData = await viewService.getOrgAllFarmsByOrgId(userId,organizationId);
	res.status(httpStatus.OK).json({ result: userData });
});
const getOrgFarmById = catchAsync(async (req: Request, res: Response) => {
	const userId = req.payload.id;
	const organizationId = req.params.orgId;
	const farmId =  req.params.farmId;
	const userData = await viewService.getOrgFarmById(userId,organizationId,farmId);
	res.status(httpStatus.OK).json({ result: userData });
});
const getOrgAllFieldsByFarmId = catchAsync(async (req: Request, res: Response) => {
	const userId = req.payload.id;
	const organizationId = req.params.orgId;
	const farmId =  req.params.farmId;
	const userData = await viewService.getOrgAllFieldsByFarmId(userId,organizationId,farmId);
	res.status(httpStatus.OK).json({ result: userData });
});

const getOrgFieldByFieldId = catchAsync(async (req: Request, res: Response) => {
	const userId = req.payload.id;
	const organizationId = req.params.orgId;
	const fieldId =  req.params.fieldId;
	const userData = await viewService.getOrgFieldByFieldId(userId,organizationId,fieldId);
	res.status(httpStatus.OK).json({ result: userData });
});

const getAllBoundariesByFieldId = catchAsync(async (req: Request, res: Response) => {
	const userId = req.payload.id;
	const organizationId = req.params.orgId;
	const fieldId =  req.params.fieldId;
	const userData = await viewService.getAllBoundariesByFieldId(userId,organizationId,fieldId);
	res.status(httpStatus.OK).json({ result: userData });
});
const getFieldBoundariesById = catchAsync(async (req: Request, res: Response) => {
	const userId = req.payload.id;
	const organizationId = req.params.orgId;
	const fieldId =  req.params.fieldId;
	const  boundId =  req.params.boundId;
	const userData = await viewService.getFieldBoundariesById(userId,organizationId,fieldId,boundId);
	res.status(httpStatus.OK).json({ result: userData });
});
export default {
	getAuthUrl,
	getAuthTokens,
	getOrganizations,
	getOrganizationsById,
	getOrgAllFarmsByOrgId,
	getOrgFarmById,
	getOrgAllFieldsByFarmId,
	getOrgFieldByFieldId,
	getAllBoundariesByFieldId,
	getFieldBoundariesById
	
};
