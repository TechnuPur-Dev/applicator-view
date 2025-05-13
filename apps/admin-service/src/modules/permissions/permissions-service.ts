/* eslint-disable @typescript-eslint/no-explicit-any */
// import httpStatus from 'http-status';
import { prisma } from '../../../../../shared/libs/prisma-client';
// import { PaginateOptions } from '../../../../../shared/types/global';
// import ApiError from '../../../../../shared/utils/api-error';
// import { UserData } from './admin-user-types';
// import { EntityType } from '../../../../../shared/constants';

// get user List

const getAllPermissions = async () => {
	// Calculate the number of users to skip based on the current page and limit
	const result = await prisma.permission.findMany({
		select:{
            id:true,
			name:true
		},
		orderBy: {
			id: 'desc',
		},
	
	}); // Fetch all permissions
	
	// Return the paginated result including users, current page, limit, total pages, and total results
	return {
		result: result,
	
	};
};






export default {
	getAllPermissions,

};
