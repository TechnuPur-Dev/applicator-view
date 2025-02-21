import httpStatus from 'http-status';
// import { Prisma } from '@prisma/client';
// import sharp from 'sharp';
// import { v4 as uuidv4 } from 'uuid';
import { JobStatus, JobType } from '@prisma/client';
import { prisma } from '../../../../../shared/libs/prisma-client';
import ApiError from '../../../../../shared/utils/api-error';
import { CreateJob } from './job-types';
import { v4 as uuidv4 } from 'uuid';
import config from '../../../../../shared/config/env-config';
import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';
import { User, PaginateOptions } from '../../../../../shared/types/global';
// import { object } from 'joi';
// import config from '../../../../../shared/config/env-config';
// import { BlobServiceClient, ContainerClient } from '@azure/storage-blob'; // Adjust based on Azure SDK usage
import { sendPushNotifications } from '../../../../../shared/helpers/push-notification';

// create grower
const createJob = async (user: User, data: CreateJob) => {
	if (user.role === 'APPLICATOR') {
		const {
			title,
			type,
			userId: growerId,
			startDate,
			endDate,
			description,
			farmId,
			sensitiveAreas,
			adjacentCrops,
			specialInstructions,
			attachments = [],
			fields = [],
			products = [],
			applicationFees = [],
		} = data;
		if (typeof growerId !== 'number') {
			throw new Error('growerId is required and must be a number');
		}
		const hasFarmPermission = await prisma.applicatorGrower.count({
			where: {
				applicatorId: user.id,
				growerId,
				grower: {
					farms: {
						some: {
							id: farmId,
							permissions: {
								some: { applicatorId: user.id, canView: true },
							},
						},
					},
				},
			},
		});
		if (!hasFarmPermission) {
			throw new ApiError(
				httpStatus.FORBIDDEN,
				'You do not have permission to access this farm.',
			);
		}

		const productIds = products.map(({ productId }) => productId);
		const productCount = await prisma.product.count({
			where: { id: { in: productIds }, createdById: user.id },
		});
		if (productCount !== productIds.length) {
			throw new ApiError(
				httpStatus.FORBIDDEN,
				'You do not have permission to access these products.',
			);
		}

		const fieldIds = fields.map(({ fieldId }) => fieldId);
		const fieldCount = await prisma.field.count({
			where: { id: { in: fieldIds }, farmId },
		});
		if (fieldCount !== fieldIds.length) {
			throw new ApiError(
				httpStatus.FORBIDDEN,
				'You do not have permission to access these fields.',
			);
		}

		const job = await prisma.job.create({
			data: {
				title,
				type,
				source: 'APPLICATOR',
				status: 'PENDING',
				growerId,
				applicatorId: user.id,
				startDate,
				endDate,
				description,
				farmId,
				sensitiveAreas,
				adjacentCrops,
				specialInstructions,
				attachments,
				fields: {
					create: fields.map(({ fieldId, actualAcres }) => ({
						fieldId,
						actualAcres,
					})),
				},
				products: {
					create: products.map(
						({ productId, totalAcres, price }) => ({
							productId,
							totalAcres,
							price,
						}),
					),
				},
				applicationFees: {
					create: applicationFees.map(
						({ description, rateUoM, perAcre }) => ({
							description,
							rateUoM,
							perAcre,
						}),
					),
				},
				Notification: {
					create: {
						userId: growerId,
						type: 'JOB_REQUEST',
					},
				},
			},
			include: {
				grower: {
					select: {
						firstName: true,
						lastName: true,
						fullName: true,
						email: true,
						phoneNumber: true,
					},
				},
				fieldWorker: { select: { fullName: true } },
				farm: {
					select: {
						name: true,
						state: { select: { id: true, name: true } },
						county: true,
						township: true,
						zipCode: true,
					},
				},
				fields: {
					select: {
						actualAcres: true,
						field: {
							select: { name: true, acres: true, crop: true },
						},
					},
				},
				products: {
					select: {
						product: {
							select: { productName: true, perAcreRate: true },
						},
						totalAcres: true,
						price: true,
					},
				},
				applicationFees: true,
			},
		});

		await sendPushNotifications({
			userIds: growerId,
			title: `Job Confirmation`,
			message: `${user.firstName} ${user.lastName} added a job that needs your confirmation.`,
			notificationType: 'JOB_CREATED',
		});
		return job;
	}
};

// get job List by applicator
const getAllJobsByApplicator = async (
	applicatorId: number,
	options: PaginateOptions,
) => {
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
	const jobs = await prisma.job.findMany({
		where: {
			applicatorId,
			status: {
				in: ['READY_TO_SPRAY', 'SPRAYED', 'INVOICED', 'PAID'],
			},
		},
		include: {
			grower: {
				select: {
					firstName: true,
					lastName: true,
					fullName: true,
					email: true,
					phoneNumber: true,
				},
			},
			fieldWorker: {
				select: {
					fullName: true,
				},
			},
			farm: {
				select: {
					name: true,
					state: true,
					county: true,
					township: true,
					zipCode: true,
				},
			},
			fields: {
				select: {
					actualAcres: true,
					field: {
						select: {
							name: true,
							acres: true,
							crop: true,
						},
					},
				},
			},
			// products: true,
			// applicationFees: true,
		},
		skip,
		take: limit,
		orderBy: {
			id: 'desc',
		},
	}); // Fetch all users
	// Calculate total acres for each job
	const formattedJobs = jobs.map((job) => ({
		...job,
		totalAcres: job.fields.reduce(
			(sum, f) => sum + (f.actualAcres || 0),
			0,
		), // Sum actualAcres, default to 0 if null
	}));
	// Calculate the total number of pages based on the total results and limit
	const totalResults = await prisma.job.count({
		where: {
			applicatorId,
			status: {
				in: ['READY_TO_SPRAY', 'SPRAYED', 'INVOICED', 'PAID'],
			},
		},
	});

	const totalPages = Math.ceil(totalResults / limit);
	// Return the paginated result including users, current page, limit, total pages, and total results
	return {
		result: formattedJobs,
		page,
		limit,
		totalPages,
		totalResults,
	};
};

// service for Job
const getJobById = async (user: User, jobId: number) => {
	// if (user.role === 'APPLICATOR') {

	// }

	const job = await prisma.job.findUnique({
		where: {
			id: jobId,
		},
		include: {
			grower: {
				select: {
					firstName: true,
					lastName: true,
					fullName: true,
					email: true,
					phoneNumber: true,
				},
			},
			fieldWorker: {
				select: {
					fullName: true,
				},
			},
			farm: {
				select: {
					name: true,
					state: true,
					county: true,
					township: true,
					zipCode: true,
				},
			},
			fields: {
				select: {
					actualAcres: true,
					field: {
						select: {
							id: true,
							name: true,
							acres: true,
							crop: true,
						},
					},
				},
			},
			products: {
				select: {
					id: true,
					totalAcres: true,
					price: true,
					product: {
						select: {
							id: true,
							productName: true,
							perAcreRate: true,
						},
					},
				},
			},
			applicationFees: true,
		},
		omit: {
			applicatorId: true,
			fieldWorkerId: true,
			farmId: true,
		},
	});
	// Check if user is null
	if (!job) {
		throw new ApiError(
			httpStatus.NOT_FOUND,
			'No job found for the given job Id.',
		);
	}

	return {
		...job,
		totalAcres: job.fields.reduce(
			(sum, f) => sum + (f.actualAcres || 0),
			0,
		), // Sum actualAcres, default to 0 if null
	};
};

// to delete job
const deleteJob = async (jobId: number) => {
	await prisma.job.delete({
		where: {
			id: jobId,
		},
	});

	return {
		message: 'Job deleted successfully.',
	};
};
const updateJobByApplicator = async (
	data: { status: JobStatus; fieldWorkerId?: number }, // fieldWorkerId optional
	jobId: number,
	user: User,
) => {
	// Fetch current job status from database
	const job = await prisma.job.findUnique({
		where: { id: jobId },
		select: {
			status: true,
		},
	});

	if (!job) {
		throw new Error('Job not found.');
	}

	const currentStatus = job.status;
	const requestedStatus = data.status;

	// Check if requested  is valid
	if (data.status) {
		if (
			(currentStatus === 'READY_TO_SPRAY' &&
				requestedStatus !== 'SPRAYED') ||
			(currentStatus === 'SPRAYED' && requestedStatus !== 'INVOICED') ||
			(currentStatus === 'INVOICED' && requestedStatus !== 'PAID') ||
			(currentStatus === 'PAID' && requestedStatus !== 'PAID')
		) {
			throw new Error(
				`Invalid status from ${currentStatus} to ${requestedStatus}.`,
			);
		}
	}

	if (data.fieldWorkerId) {
		if (currentStatus === 'READY_TO_SPRAY') {
			await prisma.job.update({
				where: { id: jobId },
				data: {
					...data,
					fieldWorkerId: data.fieldWorkerId,
					Notification: {
						create: {
							userId: data.fieldWorkerId,
							type: 'JOB_ASSIGNED',
						},
					},
				},
			});
			await sendPushNotifications({
				userIds: data.fieldWorkerId,
				title: `Job Confirmation`,
				message: `${user.firstName} ${user.lastName} assigned a job that needs your confirmation.`,
				notificationType: 'JOB_ASSIGNED',
			});
		} else {
			throw new Error(`job status is invalid to assigne a pilot.`);
		}
	}

	// Update job status
	await prisma.job.update({
		where: { id: jobId },
		data: {
			...data,
			status: data.status,
		},
	});

	return {
		message: `Job updated successfully.`,
	};
};

// const updateJobByApplicator = async (
// 	data: { status: JobStatus; fieldWorkerId: number },
// 	jobId: number,
// ) => {
// 	const job = await prisma.job.findUnique({
// 		where: { id: jobId },
// 		select: { status: true },
// 	  });
// 	  if (job?.status === "READY_TO_SPRAY" && data.status === "SPRAYED") {

// 		await prisma.job.update({
// 			where: { id: jobId },
// 			data: {
// 				status: data.status,
// 				fieldWorkerId: data.fieldWorkerId,
// 			},
// 		});
// 	  }

// 	return { message: 'Job updated successfully.' };
// };

// get pilots by applicator by Grower

const getAllPilotsByApplicator = async (applicatorId: number) => {
	const workers = await prisma.applicatorWorker.findMany({
		where: {
			applicatorId,
			workerType: 'PILOT',
			isActive: true,
		},
		select: {
			worker: {
				select: {
					id: true,
					firstName: true,
					lastName: true,
					fullName: true,
				},
			},
		},
		orderBy: {
			id: 'desc',
		},
	}); // Fetch all users

	return workers.map((worker) => worker.worker);
};

const getAllJobTypes = async () => {
	// Convert JobType enum into an array
	const jobStatusList = Object.values(JobType).map((type, index) => ({
		id: index + 1,
		name: type,
	}));
	return jobStatusList;
};

const getAllJobStatus = async () => {
	const jobStatusList = Object.values(JobStatus).map((status, index) => ({
		id: index + 1,
		name: status,
	}));
	// Filter the required statuses
	const filteredStatuses = jobStatusList.filter((status) =>
		['SPRAYED', 'INVOICED', 'PAID'].includes(status.name),
	);

	return filteredStatuses;
};

const getGrowerListForApplicator = async (applicatorId: number) => {
	const growers = await prisma.applicatorGrower.findMany({
		where: {
			applicatorId,
		},
		select: {
			grower: {
				select: {
					id: true,
					fullName: true,
				},
			},
		},
	}); // Fetch all growers

	const formatGrowers = growers.map((item) => item.grower);
	return formatGrowers;
};
const getApplicatorListForGrower = async (growerId: number) => {
	const applicators = await prisma.applicatorGrower.findMany({
		where: {
			growerId,
		},
		select: {
			applicator: {
				select: {
					id: true,
					fullName: true,
				},
			},
		},
	}); // Fetch all applicators
	const formatApplicators = applicators.map((item) => item.applicator);
	return formatApplicators;
};

const getFarmListByGrowerId = async (
	applicatorId: number,
	growerId: number,
) => {
	const farms = await prisma.farm.findMany({
		where: {
			growerId,
			permissions: {
				some: {
					applicatorId,
				},
			},
		},
		select: {
			id: true,
			name: true,
			farmImageUrl: true,
			// isActive: true,
			fields: {
				select: {
					id: true,
					name: true,
					acres: true,
				},
			},
		},
		orderBy: {
			createdAt: 'desc',
		},
	}); // Fetch all users
	// // Calculate total acres for each grower and each farm
	// const enrichedFarms = farms.map((farm) => {
	// 	const totalAcresByFarm = farm.fields.reduce(
	// 		(totalFarmAcres, field) => {
	// 			return (
	// 				totalFarmAcres +
	// 				parseFloat(field.acres?.toString() || '0')
	// 			);
	// 		},
	// 		0,
	// 	);

	// 	// Add total acres to the grower object
	// 	return {
	// 		...farm,
	// 		totalAcres: totalAcresByFarm,
	// 	};
	// });
	return farms;
};

const uploadJobAttachments = async (
	userId: number,
	files: Express.Multer.File[],
) => {
	// make connection with azure storage account for storage access
	const storageUrl = config.azureStorageUrl;
	const containerName = config.azureContainerName;
	console.log(storageUrl, containerName, 'blob');
	const blobServiceClient =
		BlobServiceClient.fromConnectionString(storageUrl);
	const containerClient: ContainerClient =
		blobServiceClient.getContainerClient(containerName);

	//  upload all file parralled at one by using promis.all
	const uploadedFiles = await Promise.all(
		files.map(async (file) => {
			// Generate unique blob names by using uniue id uuidv4
			const blobName = `jobs/${uuidv4()}_${file.originalname}`;

			const blockBlobClient =
				containerClient.getBlockBlobClient(blobName);
			await blockBlobClient.upload(file.buffer, file.buffer.length, {
				blobHTTPHeaders: {
					blobContentType: file.mimetype,
				},
			});
			return `/${containerName}/${blobName}`;
			// return {
			// 	jobAttachment: `/${containerName}/${blobName}`,
			// };
		}),
	);
	return uploadedFiles;
};
const getJobs = async (growerId: number, type: string, role: string) => {
	if (role !== 'GROWER') {
		throw new ApiError(
			httpStatus.NOT_FOUND,
			'Access denied, only growers can view jobs',
		);
	}
	let jobs = await prisma.job.findMany({
		where: {
			growerId,
		},
		include: {
			applicator: {
				select: {
					fullName: true,
					businessName: true,
				},
			},

			farm: {
				select: {
					name: true,
				},
			},
			fields: {
				select: {
					actualAcres: true,
					field: {
						select: {
							name: true,
							acres: true,
							crop: true,
						},
					},
				},
			},
			// products: true,
			// applicationFees: true,
		},
	}); // Fetch all users
	// Calculate total acres for each job

	if (type === 'BIDDING') {
		jobs = jobs.filter((job) => job.source === 'BIDDING');
	} else if (type === 'GROWER') {
		jobs = jobs.filter((job) => job.source === 'GROWER');
	} else if (type === 'APPLICATOR') {
		jobs = jobs.filter((job) => job.source === 'APPLICATOR');
	}
	return jobs.map((job) => ({
		...job,
		...job,
		...(job.applicator
			? {
					applicatorFullName: job.applicator.fullName,
					applicatorBusinessName: job.applicator.businessName,
				}
			: {}), // Applicator values as key-value pair
		...(job.farm ? { farmName: job.farm.name } : {}), // Farm values as key-value pair
		applicator: undefined, // Remove original object
		farm: undefined, // Remove original object
		totalAcres: job.fields.reduce(
			(sum, f) => sum + (f.actualAcres || 0),
			0,
		), // Sum actualAcres, default to 0 if null
	}));
};
// get apis for Bidding screen
const getOpenJobs = async () => {
	const jobs = await prisma.job.findMany({
		where: {
			source: 'BIDDING',
			// status:'OPEN_FOR_BIDDING'
		},
		include: {
			grower: {
				select: {
					firstName: true,
					lastName: true,
					fullName: true,
					email: true,
					phoneNumber: true,
				},
			},
			fieldWorker: {
				select: {
					fullName: true,
				},
			},
			farm: {
				select: {
					name: true,
					state: true,
					county: true,
					township: true,
					zipCode: true,
				},
			},
			fields: {
				select: {
					actualAcres: true,
					field: {
						select: {
							name: true,
							acres: true,
							crop: true,
						},
					},
				},
			},
			// products: true,
			// applicationFees: true,
		},
	});

	// Calculate total acres for each job
	return jobs.map((job) => ({
		...job,
		totalAcres: job.fields.reduce(
			(sum, f) => sum + (f.actualAcres || 0),
			0,
		), // Sum actualAcres, default to 0 if null
	}));
};
// get job for applicator pending approval screen
const getJobsPendingFromMe = async (Id: number, currentUser: User) => {
	const whereCondition: {
		status: 'TO_BE_MAPPED';
		applicatorId?: number;
		growerId?: number;
		source?: 'GROWER' | 'APPLICATOR';
	} = {
		status: 'TO_BE_MAPPED',
	};

	if (currentUser.role === 'APPLICATOR') {
		whereCondition.applicatorId = Id;
		whereCondition.source = 'GROWER';
	} else if (currentUser.role === 'GROWER') {
		whereCondition.growerId = Id;
		whereCondition.source = 'APPLICATOR';
	}
	const jobs = await prisma.job.findMany({
		where: whereCondition,
		include: {
			grower: {
				select: {
					firstName: true,
					lastName: true,
					fullName: true,
					email: true,
					phoneNumber: true,
				},
			},
			fieldWorker: {
				select: {
					fullName: true,
				},
			},
			farm: {
				select: {
					name: true,
					state: true,
					county: true,
					township: true,
					zipCode: true,
				},
			},
			fields: {
				select: {
					actualAcres: true,
					field: {
						select: {
							name: true,
							acres: true,
							crop: true,
						},
					},
				},
			},
			// products: true,
			// applicationFees: true,
		},
	});
	// Calculate total acres for each job
	return jobs.map((job) => ({
		...job,
		totalAcres: job.fields.reduce(
			(sum, f) => sum + (f.actualAcres || 0),
			0,
		), // Sum actualAcres, default to 0 if null
	}));
};
const getJobsPendingFromGrowers = async (Id: number) => {
	const jobs = await prisma.job.findMany({
		where: {
			applicatorId: Id,
			source: 'APPLICATOR',
			status: 'PENDING',
		},
		include: {
			grower: {
				select: {
					firstName: true,
					lastName: true,
					fullName: true,
					email: true,
					phoneNumber: true,
				},
			},
			fieldWorker: {
				select: {
					fullName: true,
				},
			},
			farm: {
				select: {
					name: true,
					state: true,
					county: true,
					township: true,
					zipCode: true,
				},
			},
			fields: {
				select: {
					actualAcres: true,
					field: {
						select: {
							name: true,
							acres: true,
							crop: true,
						},
					},
				},
			},
			// products: true,
			// applicationFees: true,
		},
	});

	// Calculate total acres for each job
	return jobs.map((job) => ({
		...job,
		totalAcres: job.fields.reduce(
			(sum, f) => sum + (f.actualAcres || 0),
			0,
		), // Sum actualAcres, default to 0 if null
	}));
};
// const getJobsPendingFromApplicators = async (Id: number) => {
// 	const jobs = await prisma.job.findMany({
// 		where: {
// 			growerId: Id,
// 			source: 'GROWER',
// 			status: 'PENDING',
// 		},
// 		include: {
// 			grower: {
// 				select: {
// 					firstName: true,
// 					lastName: true,
// 					fullName: true,
// 					email: true,
// 					phoneNumber: true,
// 				},
// 			},
// 			fieldWorker: {
// 				select: {
// 					fullName: true,
// 				},
// 			},
// 			farm: {
// 				select: {
// 					name: true,
// 					state: true,
// 					county: true,
// 					township: true,
// 					zipCode: true,
// 				},
// 			},
// 			fields: {
// 				select: {
// 					actualAcres: true,
// 					field: {
// 						select: {
// 							name: true,
// 							acres: true,
// 							crop: true,
// 						},
// 					},
// 				},
// 			},
// 			// products: true,
// 			// applicationFees: true,
// 		},
// 	});

// 	// Calculate total acres for each job
// 	return jobs.map((job) => ({
// 		...job,
// 		totalAcres: job.fields.reduce(
// 			(sum, f) => sum + (f.actualAcres || 0),
// 			0,
// 		), // Sum actualAcres, default to 0 if null
// 	}));
// };

const updatePendingJobStatus = async (
	data: { userId: number; status: JobStatus }, // fieldWorkerId optional
	jobId: number,
	user: User,
) => {
	// Fetch current job  from database

	const job = await prisma.job.findUnique({
		where: {
			id: jobId,
		},
	});
	if (!job) {
		throw new Error('Job not found.');
	}

	// Check if requested  is valid
	if (data.status) {
		// Update job status
		await prisma.job.update({
			where: { id: jobId },
			data: {
				status: data.status,
				Notification: {
					create: {
						userId: data?.userId,// user id of those user who get the notification related to job status 
						type: data.status === "READY_TO_SPRAY" ? 'JOB_ASSIGNED':'JOB_REJECTED'
					},
				},
			},
		});
	}
	await sendPushNotifications({
		userIds: data?.userId,
		title: `Job ${data.status} === "READY_TO_SPRAY" ? Accepted : ${data.status}  `,
		message: `${user.firstName} ${user.lastName} ${data.status} === "READY_TO_SPRAY" ? ACCEPTED : ${data.status} the job `,
		notificationType: `${data.status} === "READY_TO_SPRAY" ? 'JOB_ASSIGNED : JOB_REJECTED '`,
	});

	return {
		message: `Job updated successfully.`,
	};
};

const getJobByPilot = async (applicatorId: number, pilotId: number) => {
	return await prisma.job.findMany({
		where: { applicatorId, fieldWorkerId: pilotId },
	});
};
const getAssignedJobs = async (applicatorId: number) => {
	return await prisma.job.findMany({
		where: { applicatorId, status: 'READY_TO_SPRAY', fieldWorkerId: null },
	});
};
export default {
	createJob,
	getAllJobsByApplicator,
	getJobById,
	deleteJob,
	updateJobByApplicator,
	getAllPilotsByApplicator,
	getAllJobTypes,
	getAllJobStatus,
	getGrowerListForApplicator,
	getApplicatorListForGrower,
	getFarmListByGrowerId,
	uploadJobAttachments,
	getJobs,
	getOpenJobs,
	getJobsPendingFromMe,
	getJobsPendingFromGrowers,
	// getJobsPendingFromApplicators,
	updatePendingJobStatus,
	getJobByPilot,
	getAssignedJobs,
};
