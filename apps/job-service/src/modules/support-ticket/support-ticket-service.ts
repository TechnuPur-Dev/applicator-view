import httpStatus from 'http-status';
// import { Prisma } from '@prisma/client';
// import sharp from 'sharp';
// import { v4 as uuidv4 } from 'uuid';
import { JobStatus, JobType } from '@prisma/client';
import ApiError from '../../../../../shared/utils/api-error';


const getAllJobTypes = async () => {
	try {
		// Convert JobType enum into an array
		const jobStatusList = Object.values(JobType).map((type, index) => ({
			id: index + 1,
			name: type,
		}));
		return jobStatusList;
	} catch (error) {
		if (error instanceof Error) {
			// Handle generic errors
			throw new ApiError(
				httpStatus.CONFLICT,
				'Error while retreiving  list.',
			);
		}
	}
};

const getAllJobStatus = async () => {
	try {
		const jobStatusList = Object.values(JobStatus).map((status, index) => ({
			id: index + 1,
			name: status,
		}));
		return jobStatusList;
	} catch (error) {
		if (error instanceof Error) {
			// Handle generic errors
			throw new ApiError(
				httpStatus.CONFLICT,
				'Error while retreiving  list.',
			);
		}
	}
};

export default {
	
	getAllJobTypes,
	getAllJobStatus,
	
};
