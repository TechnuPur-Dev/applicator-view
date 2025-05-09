import httpStatus from 'http-status';
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
import { hashPassword } from '../../helper/bcrypt';
import {
	PaginateOptions,

} from '../../../../../shared/types/global';
import ApiError from '../../../../../shared/utils/api-error';
import { UserData } from './admin-user-types';
// import { generateToken, verifyInvite } from '../../helper/invite-token';
// import { InviteStatus } from '@prisma/client';


// get user List
const createUser = async (data: UserData) => {
	const { firstName, lastName, email } = data;
	const userExist = await prisma.user.findUnique({
		where: {
			email: email,
		}
	})
	if (userExist) {
		throw new ApiError(
			httpStatus.BAD_REQUEST,
			'user with this email already exist.',
		);
	}
	let { password } = data;
	if (password) {
		const hashedPassword = await hashPassword(password);
		password = hashedPassword;
	}

	const user = await prisma.user.create({
		data: {
			...data,
			email: email,
			password:password,
			fullName: `${firstName} ${lastName}`,
			role: 'SUPER_ADMIN_USER',

		},
		include: {
			state: true
		},
		omit: {
			profileImage: true,
			password: true,
			businessName: true,
			experience: true,
			joiningDate:true,
			lastViewedAt:true
		},
	});
	const formattedResponse = {
		...user,
		state:undefined,
		stateId: user.state?.id,
		stateName: user.state?.name
	}
	return {
		result: formattedResponse,
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
		where: {
			role: 'SUPER_ADMIN_USER'
		},
		include: {
			state: true
		},
		skip,
		take: limit,
		orderBy: {
			id: 'desc',
		},
		omit: {
			password: true,
			joiningDate: true,
			lastViewedAt: true
		}
	}); // Fetch all users
	const totalResults = await prisma.user.count({
		where: {
			role: 'SUPER_ADMIN_USER'
		}
	});
	const formattedResponse = users.map((item) => { // flate response
		return {
			...item,
			state:undefined,
			stateId: item.state?.id,
			stateName: item.state?.name
		}

	})
	const totalPages = Math.ceil(totalResults / limit);
	// Return the paginated result including users, current page, limit, total pages, and total results
	return {
		result: formattedResponse,
		page,
		limit,
		totalPages,
		totalResults,
	};
};

const getUserById = async (userId: number) => {

	const userDetail = await prisma.user.findUnique({
		where: {
			id: userId
		},
		include: {
			state: true
		},
		omit: {
			password: true,
			joiningDate:true,
			lastViewedAt:true
		}
	});
	if (!userDetail) {
		throw new ApiError(
			httpStatus.NOT_FOUND,
			'user not found',
		);
	}
	const formattedResponse = {
		...userDetail,
		state:undefined,
		stateId: userDetail.state?.id,
		stateName: userDetail.state?.name
	}
	return {
		result: formattedResponse,
	};
};
const deleteUser = async (userId: number) => {
	const userExist = await prisma.user.findUnique({
		where: {
			id: userId,
			role: 'SUPER_ADMIN_USER'
		}
	})
	if (!userExist) {
		throw new ApiError(
			httpStatus.BAD_REQUEST,
			'Admin user with this Id not found.',
		);
	}
	await prisma.user.delete({
		where: {
			id: userId
		},
		omit: {
			password: true
		}
	});

	return {
		result: 'Admin user deleted successfully'
		,
	};
};
const disableUser = async (
	data: {
		userId: number,
		status: boolean
	}) => {
	console.log(data, 'userId')
	const { userId, status } = data
	const userExist = await prisma.user.findUnique({
		where: {
			id: userId,
			role: 'SUPER_ADMIN_USER'
		}
	})
	console.log(userExist, 'userExist')
	if (!userExist) {
		throw new ApiError(
			httpStatus.BAD_REQUEST,
			'Admin user with this Id not found.',
		);
	}
	await prisma.user.update({
		where: {
			id: userId
		},
		data: {
			isActive: status
		}
	})
	return {
		message: status ? 'user enable successfully' : 'user disable successfully'
	}
}



export default {
	createUser,
	getAllUsers,
	getUserById,
	deleteUser,
	disableUser

};