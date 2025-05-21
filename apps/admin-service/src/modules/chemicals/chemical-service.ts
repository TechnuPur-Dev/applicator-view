/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import { prisma } from '../../../../../shared/libs/prisma-client';
// import { Prisma } from '@prisma/client';
// import { PaginateOptions } from '../../../../../shared/types/global';
import ApiError from '../../../../../shared/utils/api-error';
// import { chemicalData } from './chemical-types';
import { PaginateOptions } from '../../../../../shared/types/global';
import * as XLSX from 'xlsx';
import fs from 'fs';
// import { chemicalData } from './chemical-types';
// import { EntityType } from '../../../../../shared/constants';

// create chemical
const bulkUploadChemicals = async (file: Express.Multer.File,) => {
	console.log('Uploaded file:', file.path);
	 const filePath = file.path;

  // Step 1: Read Excel
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const jsonData = XLSX.utils.sheet_to_json<any>(sheet);

  if (!jsonData || jsonData.length === 0) {
    throw new Error('Excel file is empty or format is invalid.');
  }

  // Format only entries that contain number and date 
  jsonData.forEach((item: any) => {
	delete item.id
    if (item.companyNumber !== null && item.companyNumber !== undefined) {
      const toValidISOString = (val: any) => {
        const d = new Date(val);
        return isNaN(d.getTime()) ? undefined : d.toISOString();
      };

      item.companyNumber = String(item.companyNumber);
      item.ridpNumberSort = item.ridpNumberSort ? String(item.ridpNumberSort) : null;
      item.firstRegistrationDate = toValidISOString(item.firstRegistrationDate);
      item.statusDate = toValidISOString(item.statusDate);
      item.maxLabelDate = toValidISOString(item.maxLabelDate);
	  item.labelDates =toValidISOString(item.labelDates);
    }
  });

  //  Insert all data 
  await prisma.chemical.createMany({
    data: jsonData,
    skipDuplicates: true,
  });

  // Delete uploaded file
  await fs.unlinkSync(filePath);

  return {
    message: 'Data uploaded successfully.',
    total: jsonData.length,
  };
};
// get user List
const getAllChemicals = async (options: PaginateOptions) => {
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
	const data = await prisma.chemical.findMany({
		skip,
		take: limit,
		orderBy: { id: 'asc' }
	});
	const totalResults = await prisma.chemical.count({});

	const totalPages = Math.ceil(totalResults / limit);
	return {
		result: data,
		page,
		limit,
		totalPages,
		totalResults,

	}

}

const updateChemical = async (chemicalId: number, data:any) => {
	const chemical = await prisma.chemical.findUnique({
		where: { id: chemicalId },
		select: { id: true },
	});
	if (!chemical) {
		throw new ApiError(httpStatus.NOT_FOUND, 'chemical not found.');
	}
	const updatedchemical = await prisma.chemical.update({
		where: { id: chemicalId },
		data,
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





export default {
	bulkUploadChemicals,
	getAllChemicals,
	updateChemical,
	deleteChemical

};
