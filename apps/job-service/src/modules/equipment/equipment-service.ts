import httpStatus from 'http-status';
import { Prisma } from '@prisma/client';
import { prisma } from '../../../../../shared/libs/prisma-client';
// import { EquipmentType } from '@prisma/client';
import { CreateData } from './equipment-types';
import ApiError from '../../../../../shared/utils/api-error';
import { PaginateOptions, User } from './../../../../../shared/types/global';
import { EquipmentType } from '@prisma/client';

const createEquipment = async (createdById: number, data: CreateData) => {
	const existingEquipment = await prisma.equipment.findFirst({
		where: { serialNumber: data.serialNumber },
	});

	if (existingEquipment) {
		throw new ApiError(
			httpStatus.BAD_REQUEST,
			'Serial number already exists, please use a unique serial number.',
		);
	}
	const result = await prisma.equipment.create({
		data: {
			manufacturer: data.manufacturer,
			type: data.type as EquipmentType,
			model: data.model,
			nickname: data.nickname,
			serialNumber: data.serialNumber,
			userId: createdById,
		},
	});

	return result;
};

const getAllEquipmentList = async (user: User, options: PaginateOptions & {
	label?: string,
	searchValue?: string
}) => {
	// Set the limit of users to be returned per page, default to 10 if not specified or invalid
	const limit =
		options.limit && parseInt(options.limit, 10) > 0
			? parseInt(options.limit, 10)
			: 10;
	// Set the page number, default to 1 if not specified or invalid
	const page =
		options.page && parseInt(options.page, 10) > 0
			? parseInt(options.page, 10)
			: 1;
	// Calculate the number of users to skip based on the current page and limit
	const skip = (page - 1) * limit;
	const filters: Prisma.EquipmentWhereInput = {
		userId: user.id,
	}
	if (options.label && options.searchValue) {
		const searchFilter: Prisma.EquipmentWhereInput = {};
		const searchValue = options.searchValue;
		if (options.label === 'all') {
			const searchValue = options.searchValue?.toUpperCase();

			// Try to match enums first
			const isTypeMatch = Object.values(EquipmentType).includes(
				searchValue as EquipmentType,
			);
			if(isTypeMatch){
				filters.type = searchValue as EquipmentType;
			}else{
			Object.assign(filters, {
				OR: [
					{
						model: { contains: options.searchValue, mode: 'insensitive' },
					},
					{
						nickname: { contains: options.searchValue, mode: 'insensitive' },
					},
					{
						serialNumber: { contains: options.searchValue, mode: 'insensitive' },
					},


				]
			})
		}
		} else {
			switch (options.label) {
				case 'id':
					searchFilter.id = parseInt(searchValue, 10);
					break;
				case 'manufacturer':
					searchFilter.manufacturer = {
						contains: searchValue, mode: 'insensitive',
					};
					break;
				case 'type':
					searchFilter.type = {
						equals: searchValue.toUpperCase() as EquipmentType,
					};
					break;
				case 'model':
					searchFilter.model = {
						contains: searchValue, mode: 'insensitive',
					};
					break;
				case 'nickname':
					searchFilter.nickname = {
						contains: searchValue, mode: 'insensitive',
					};
					break;
				case 'serialNumber':
					searchFilter.serialNumber = {
						contains: searchValue, mode: 'insensitive',
					};
					break;
				default:
					throw new Error('Invalid label provided.');
			}
			Object.assign(filters, searchFilter); // Merge filters dynamically
		}
	}
	const result = await prisma.equipment.findMany({
		where: filters,
		skip,
		take: limit,
		orderBy: {
			id: 'desc',
		},
	});
	const totalResults = await prisma.equipment.count({
		where: filters
	});

	const totalPages = Math.ceil(totalResults / limit);
	// Return the paginated result including users, current page, limit, total pages, and total results
	return {
		result: result,
		page,
		limit,
		totalPages,
		totalResults,
	};
};
const getEquipmentById = async (user: User, id: number) => {
	const result = await prisma.equipment.findUnique({
		where: {
			id,
			userId: user.id,
		},
	});
	if (!result) {
		throw new ApiError(httpStatus.NOT_FOUND, 'item not found');
	}
	return result;
};
const updateEquipment = async (user: User, id: number, data: CreateData) => {
	const result = await prisma.equipment.update({
		where: { id, userId: user.id },
		data: {
			...data,
		},
	});
	if (!result) {
		throw new ApiError(httpStatus.NOT_FOUND, 'item not found');
	}
	return result;
};

const deleteEquipment = async (user: User, id: number) => {
	const result = await prisma.equipment.delete({
		where: { id, userId: user.id },
	});

	return result;
};
export default {
	createEquipment,
	getAllEquipmentList,
	getEquipmentById,
	updateEquipment,
	deleteEquipment,
};
