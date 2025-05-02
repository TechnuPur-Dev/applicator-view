// import httpStatus from 'http-status';
// import { Decimal } from '@prisma/client/runtime/library';
import { Prisma, } from '@prisma/client';
// import sharp from 'sharp';
// import { v4 as uuidv4 } from 'uuid';
// import axios from 'axios';
import { prisma } from '../../../../../shared/libs/prisma-client';
// import {
// 	UpdateUser,
// 	UpdateStatus,
// 	UpdateArchiveStatus,
// 	ResponseData,
// } from './user-types';
// import config from '../../../../../shared/config/env-config';
// import { BlobServiceClient, ContainerClient } from '@azure/storage-blob'; // Adjust based on Azure SDK usage
// import { mailHtmlTemplate } from '../../../../../shared/helpers/node-mailer';
// import { sendEmail } from '../../../../../shared/helpers/node-mailer';
// import { hashPassword } from '../../helper/bcrypt';
import {
	PaginateOptions,
	
} from '../../../../../shared/types/global';
import ApiError from '../../../../../shared/utils/api-error';
// import { generateToken, verifyInvite } from '../../helper/invite-token';
// import { InviteStatus } from '@prisma/client';


// get user List
const getAllUsers = async (options: PaginateOptions) => {
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
	const users = await prisma.user.findMany({
		skip,
		take: limit,
		orderBy: {
			id: 'desc',
		},
		omit:{
			password:true
		}
	}); // Fetch all users
	const totalResults = await prisma.user.count();

	const totalPages = Math.ceil(totalResults / limit);
	// Return the paginated result including users, current page, limit, total pages, and total results
	return {
		result: users,
		page,
		limit,
		totalPages,
		totalResults,
	};
};
const getApplicatorUsers = async (options: PaginateOptions & {
	searchValue?: string;
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

	// Search condition
	const whereClause: Prisma.UserWhereInput = { 
		role: 'APPLICATOR', // Filter only applicators
	};

	// Apply email search if given
	if (options.searchValue) {
		whereClause.email = {
			contains: options.searchValue,
			mode: 'insensitive',
		};
	}

	const users = await prisma.user.findMany({
		where: whereClause,
		skip,
		take: limit,
		orderBy: {
			id: 'desc',
		},
		select: {
			id: true,
			firstName: true,
			lastName: true,
			fullName:true,
			phoneNumber:true,
			email: true,
			address1:true,
			address2:true,
			role:true
			
		},
	});

	const totalResults = await prisma.user.count({ where: whereClause });

	const totalPages = Math.ceil(totalResults / limit);

	return {
		result: users,
		page,
		limit,
		totalPages,
		totalResults,
	};
};
const getGrowerUsers = async (options: PaginateOptions & {
	searchValue?: string;
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

	// Search condition
	const whereClause: Prisma.UserWhereInput = { 
		role: 'GROWER', // Filter only applicators
	};

	// Apply email search if given
	if (options.searchValue) {
		whereClause.email = {
			contains: options.searchValue,
			mode: 'insensitive',
		};
	}

	const users = await prisma.user.findMany({
		where: whereClause,
		skip,
		take: limit,
		orderBy: {
			id: 'desc',
		},
		select: {
			id: true,
			firstName: true,
			lastName: true,
			fullName:true,
			phoneNumber:true,
			email: true,
			address1:true,
			address2:true,
			role:true
		},
	});

	const totalResults = await prisma.user.count({ where: whereClause });

	const totalPages = Math.ceil(totalResults / limit);

	return {
		result: users,
		page,
		limit,
		totalPages,
		totalResults,
	};
};
const getPilotUsers = async (options: PaginateOptions & {
	searchValue?: string;
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

	// Search condition
	const whereClause: Prisma.UserWhereInput = { 
		role: 'WORKER', // Filter only applicators
	};

	// Apply email search if given
	if (options.searchValue) {
		whereClause.email = {
			contains: options.searchValue,
			mode: 'insensitive',
		};
	}

	const users = await prisma.user.findMany({
		where: whereClause,
		skip,
		take: limit,
		orderBy: {
			id: 'desc',
		},
		select: {
			id: true,
			firstName: true,
			lastName: true,
			fullName:true,
			phoneNumber:true,
			email: true,
			address1:true,
			address2:true,
			role:true
		},
	});

	const totalResults = await prisma.user.count({ where: whereClause });

	const totalPages = Math.ceil(totalResults / limit);

	return {
		result: users,
		page,
		limit,
		totalPages,
		totalResults,
	};
};

const getUserById = async (userId:number) => {
	
	const userDetail = await prisma.user.findUnique({
		where: {
           id:userId
		},
	  omit:{
		password:true
	  }
	});
if(!userDetail){
	throw new ApiError(
		httpStatus.NOT_FOUND,
		'user not found',
	);
}
	return {
		result: userDetail,
	};
};
const deleteUser = async (userId:number) => {
	
	 await prisma.user.delete({
		where: {
           id:userId
		},
	  omit:{
		password:true
	  }
	});

	return {
		result: 'user account deleted successfully'
		,
	};
};



export default {

	getAllUsers,
	getApplicatorUsers,
	getGrowerUsers,
	getPilotUsers,
	getUserById,
	deleteUser
	
};
