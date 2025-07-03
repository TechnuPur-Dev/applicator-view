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

const getOrganizationById = catchAsync(async (req: Request, res: Response) => {
	const userId = req.payload.id;
	const organizationId = req.params.orgId;
	const userData = await viewService.getOrganizationById(
		userId,
		organizationId,
	);
	res.status(httpStatus.OK).json({ result: userData });
});
const getFarmsByOrgId = catchAsync(async (req: Request, res: Response) => {
	const userId = req.payload.id;
	const organizationId = req.params.orgId;
	const userData = await viewService.getFarmsByOrgId(userId, organizationId);
	res.status(httpStatus.OK).json({ result: userData });
});
const getOrgFarmById = catchAsync(async (req: Request, res: Response) => {
	const userId = req.payload.id;
	const organizationId = req.params.orgId;
	const farmId = req.params.farmId;
	const userData = await viewService.getOrgFarmById(
		userId,
		organizationId,
		farmId,
	);
	res.status(httpStatus.OK).json({ result: userData });
});
const getFieldsByFarmId = catchAsync(async (req: Request, res: Response) => {
	const userId = req.payload.id;
	const organizationId = req.params.orgId;
	const farmId = req.params.farmId;
	const userData = await viewService.getFieldsByFarmId(
		userId,
		organizationId,
		farmId,
	);
	res.status(httpStatus.OK).json({ result: userData });
});

const getOrgFieldByFieldId = catchAsync(async (req: Request, res: Response) => {
	const userId = req.payload.id;
	const organizationId = req.params.orgId;
	const fieldId = req.params.fieldId;
	const userData = await viewService.getOrgFieldByFieldId(
		userId,
		organizationId,
		fieldId,
	);
	res.status(httpStatus.OK).json({ result: userData });
});

const getBoundariesByFieldId = catchAsync(
	async (req: Request, res: Response) => {
		const userId = req.payload.id;
		const organizationId = req.params.orgId;
		const fieldId = req.params.fieldId;
		const userData = await viewService.getBoundariesByFieldId(
			userId,
			organizationId,
			fieldId,
		);
		res.status(httpStatus.OK).json({ result: userData });
	},
);
const getFieldBoundaryById = catchAsync(async (req: Request, res: Response) => {
	const userId = req.payload.id;
	const organizationId = req.params.orgId;
	const fieldId = req.params.fieldId;
	const boundId = req.params.boundId;
	const userData = await viewService.getFieldBoundaryById(
		userId,
		organizationId,
		fieldId,
		boundId,
	);
	res.status(httpStatus.OK).json({ result: userData });
});
export default {
	getAuthUrl,
	getAuthTokens,
	getOrganizations,
	getOrganizationById,
	getFarmsByOrgId,
	getOrgFarmById,
	getFieldsByFarmId,
	getOrgFieldByFieldId,
	getBoundariesByFieldId,
	getFieldBoundaryById,
};
