/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
// import { Prisma } from '@prisma/client';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
// import config from '../../../../../shared/config/env-config';
import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';
import { prisma } from '../../../../../shared/libs/prisma-client';
import { EquipmentType } from '@prisma/client';
import { CreateData } from './integration-types';
import ApiError from '../../../../../shared/utils/api-error';
import { PaginateOptions, User } from '../../../../../shared/types/global';
import { apis } from '../../helper/xag-integration';
import config from '../../config/env-config';

const inviteUrl = async () => {
	const result = await apis.inviteUrl({
		token: config.xag_dev_token,
	});
	return result.data;
};
const bindDevices = async (data: any) => {
	const result = await apis.bindDevices({
		token: config.xag_dev_token,
		deviceSn: data.deviceSn,
	});
	return result.data;
};
const devicesPage = async (data: any) => {
	const result = await apis.devicesPage({
		token: config.xag_dev_token,
		pageNo: data.pageNo,
		pageSize: data.pageSize,
	});
	return result.data;
};
const worksPage = async (data: any) => {
	const result = await apis.worksPage({
		token: config.xag_dev_token,
		pageNo: data.pageNo,
		pageSize: data.pageSize,
		sn: data.sn,
	});
	return result.data;
};
const workReport = async (data: any) => {
	const uploadNationalCard = await apis.workReport({
		token: config.xag_dev_token,
		sn: data.sn,
		workGuid: data.workGuid,
	});
	return uploadNationalCard.data;
};

export default {
	inviteUrl,
	bindDevices,
	devicesPage,
	worksPage,
	workReport,
};
