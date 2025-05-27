/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import { prisma } from '../../../../../shared/libs/prisma-client';
import { Prisma } from '@prisma/client';
// import { PaginateOptions } from '../../../../../shared/types/global';
import ApiError from '../../../../../shared/utils/api-error';
// import { chemicalData } from './chemical-types';
import { PaginateOptions } from '../../../../../shared/types/global';
import * as XLSX from 'xlsx';
// import fs from 'fs';
import { chemicalData } from './chemical-types';
// import { EntityType } from '../../../../../shared/constants';
// create chemical
const bulkUploadChemicals = async (fileBuffer: Buffer) => {
	const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
	const sheet = workbook.Sheets[workbook.SheetNames[0]];
	const jsonData = XLSX.utils.sheet_to_json<any>(sheet);

	if (!jsonData || jsonData.length === 0) {
		throw new Error('Excel file is empty or format is invalid.');
	}

	//  convert to DateTime ISO string
	const toValidISOString = (val: any): string | undefined => {
		if (!val) return undefined;
		const d = new Date(val);
		return isNaN(d.getTime()) ? undefined : d.toISOString();
	};

	// Format and clean data according to schema
	const formattedData = jsonData.map((item: any) => {
		return {
			productName: item.productName?.toString() || '',
			registrationNumber: item.registrationNumber?.toString() || '',
			registrationType: item.registrationType || null,
			companyNumber: item.companyNumber?.toString() || null,
			companyName: item.companyName || null,
			firstRegistrationDate: toValidISOString(item.firstRegistrationDate),
			status: item.status || null,
			statusDescription: item.statusDescription || null,
			statusGroup: item.statusGroup || null,
			statusDate: toValidISOString(item.statusDate),
			useType: item.useType || null,
			signalWord: item.signalWord || null,
			rupFlag: item.rupFlag?.toString().toLowerCase() === 'true',
			rupReason: item.rupReason || null,
			pesticideType: item.pesticideType || null,
			pesticideCategory: item.pesticideCategory || null,
			physicalForm: item.physicalForm || null,
			ais: item.ais || null,
			pests: item.pests || null,
			sites: item.sites || null,
			team: item.team || null,
			pmEmail: item.pmEmail || null,
			ridpNumberSort: item.ridpNumberSort?.toString() || null,
			usePattern: item.usePattern || null,
			transferHistory: item.transferHistory || null,
			abns: item.abns || null,
			meTooFlag: item.meTooFlag?.toString().toLowerCase() === 'true',
			meTooRefs: item.meTooRefs || null,
			maxLabelDate: toValidISOString(item.maxLabelDate),
			labelDates: item.labelDates || null,
			labelNames: item.labelNames || null,
			//   createdAt: toValidISOString(item.createdAt) || undefined,
			//   updatedAt: toValidISOString(item.updatedAt) || undefined,
			//   deletedAt: toValidISOString(item.deletedAt) || null,
		};
	});
	console.log(formattedData, 'formattedData')
	// Insert all data
	await prisma.chemical.createMany({
		data: formattedData,
		skipDuplicates: true,
	});

	return {
		message: 'Data uploaded successfully.',
		total: formattedData.length,// how much records added 
	};
};
// create 
const createChemical = async (data: chemicalData) => {
	const dataExist = await prisma.chemical.findFirst({
		where: {
			productName: data.productName
		},
	});
	console.log(dataExist, 'dataExist')
	if (dataExist) {
		throw new ApiError(httpStatus.CONFLICT, 'chemical record already exist.');
	}
	const result = await prisma.chemical.create({
		data: {
			...data
		}
	});
	return { result };
};
// get user List
const getAllChemicals = async (options: PaginateOptions & {
	label?: string,
	searchValue?: string
}) => {
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
	const filter: Prisma.ChemicalWhereInput = {}
	// Apply dynamic label filtering
	if (options.label && options.searchValue) {
		const searchValue = options.searchValue;
		// Global search if label is "All"
		if (options.label === 'all') {
			filter.OR = [
				{
					id: !isNaN(Number(searchValue))
						? parseInt(searchValue, 10)
						: undefined,
				},
				{
					productName: {
						contains: searchValue,
						mode: 'insensitive',
					},
				},
				{
					registrationNumber: {
						contains: searchValue,
						mode: 'insensitive',
					},

				},
				{
					registrationType: {

						contains: searchValue,
						mode: 'insensitive',

					},
				},
				{
					companyNumber: {
						contains: searchValue,
						mode: 'insensitive'
					}
				},
				{
					companyName: {
						contains: searchValue,
						mode: 'insensitive'
					}
				},
				{
					pesticideType: {
						contains: searchValue,
						mode: 'insensitive'
					}
				},
				{
					pesticideCategory: {
						contains: searchValue,
						mode: 'insensitive'
					}
				},

			]

		} else {
			switch (options.label) {
				case 'productName':
					filter.productName = {
						contains: searchValue,
						mode: 'insensitive',
					};
					break;
				case 'registrationNumber':
					filter.registrationNumber = {
						contains: searchValue,
						mode: 'insensitive',
					};
					break;
				case 'registrationType':
					filter.registrationType = {
						contains: searchValue,
						mode: 'insensitive',
					};
					break;
				case 'companyName':
					filter.companyName = {
						contains: searchValue,
						mode: 'insensitive',
					}
					break;

				case 'companyNumber':
					filter.companyNumber = {
						contains: searchValue,
						mode: 'insensitive',
					};
					break;
				case 'pesticideType':
					filter.pesticideType = {
						contains: searchValue,
						mode: 'insensitive',
					};
					break;
				case 'pesticideCategory':
					filter.pesticideCategory = {
						contains: searchValue,
						mode: 'insensitive',
					};
					break;
				default:
					throw new Error('Invalid label provided.');
			}

		}
	}
	const data = await prisma.chemical.findMany({
		where: filter ? filter : undefined,
		skip,
		take: limit,
		orderBy: { id: 'desc' }
	});
	const totalResults = await prisma.chemical.count({
		where: filter ? filter : undefined,
	});

	const totalPages = Math.ceil(totalResults / limit);
	return {
		result: data,
		page,
		limit,
		totalPages,
		totalResults,

	}

}

const updateChemical = async (chemicalId: number, data: any) => {
	const chemical = await prisma.chemical.findUnique({
		where: { id: chemicalId },
		select: { id: true },
	});
	if (!chemical) {
		throw new ApiError(httpStatus.NOT_FOUND, 'chemical not found.');
	}
	const updatedchemical = await prisma.chemical.update({
		where: { id: chemicalId },
		data: {
			...data
		},
	});

	return { updatedchemical };
};
const deleteChemical = async (Id: number) => {
	// Check if related records exist
	const relatedRecords = await prisma.chemical.findUnique({
		where: { id: Id }
	});
	if (!relatedRecords) {
		throw new ApiError(
			httpStatus.NOT_FOUND,
			'chemical not found.',
		);
	}
	await prisma.chemical.delete({
		where: {
			id: Id,
		},
	});

	return {
		message: 'chemical deleted successfully.',
	};
};

const getChemicalById = async (chemicalId: number) => {
	const chemical = await prisma.chemical.findUnique({
		where: { id: chemicalId },
		select: { id: true },
	});
	if (!chemical) {
		throw new ApiError(httpStatus.NOT_FOUND, 'chemical not found.');
	}
	const result = await prisma.chemical.findUnique({
		where: { id: chemicalId },
	});

	return { result };
};

export default {
	bulkUploadChemicals,
	getAllChemicals,
	updateChemical,
	deleteChemical,
	createChemical,
	getChemicalById

};
