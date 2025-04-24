// import httpStatus from 'http-status';
// import { Decimal } from '@prisma/client/runtime/library';
// import { Prisma, } from '@prisma/client';
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
import { UserData } from './admin-user-types';
// import { generateInviteToken, verifyInvite } from '../../helper/invite-token';
// import { InviteStatus } from '@prisma/client';


// get user List
const createUser = async (userId:number,data:UserData) => {
	const { firstName, lastName,email } = data;
	const userExist = await prisma.user.findUnique({
		where:{
			email:email,
		}
	})
	if(userExist){
		throw new ApiError(
			httpStatus.BAD_REQUEST,
			'user with this email already exist.',
		);
	}
	const user = await prisma.user.create({
		data: {
			...data,
			email:email,
			fullName: `${firstName} ${lastName}`,
			role: 'SUPER_ADMIN_USER',
		},
		omit: {
			profileImage:true,
			password: true,
			businessName:true,
			experience:true
		},
	});
	return {
		result: user,
	};
};
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
		where:{
			role:'SUPER_ADMIN_USER'
		},
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
	createUser,
	getAllUsers,
	getUserById,
	deleteUser
	
};
