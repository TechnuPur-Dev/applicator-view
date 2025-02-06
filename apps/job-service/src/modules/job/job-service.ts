import httpStatus from 'http-status';
import { Prisma } from '@prisma/client';
// import sharp from 'sharp';
// import { v4 as uuidv4 } from 'uuid';
import { JobStatus, JobType } from '@prisma/client';
import { prisma } from '../../../../../shared/libs/prisma-client';
import ApiError from '../../../../../shared/utils/api-error';
import { CreateJob } from './job-types';
import { v4 as uuidv4 } from 'uuid';
import config from '../../../../../shared/config/env-config';
import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';

// import { object } from 'joi';
// import config from '../../../../../shared/config/env-config';
// import { BlobServiceClient, ContainerClient } from '@azure/storage-blob'; // Adjust based on Azure SDK usage

// create grower
const createJob = async (data: CreateJob) => {
	try {
		const {
			title,
			type,
			source,
			status,
			growerId,
			applicatorId,
			fieldWorkerId,
			startDate,
			endDate,
			description,
			farmId,
			sensitiveAreas,
			adjacentCrops,
			specialInstructions,
			attachments,
			fields = [],
			products = [],
			applicationFees = [],
		} = data;

		const newJob = await prisma.job.create({
			data: {
				title,
				type,
				source,
				status,
				growerId,
				applicatorId,
				fieldWorkerId,
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
						({ name, ratePerAcre, totalAcres, price }) => ({
							name,
							ratePerAcre,
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
			},
			include: {
				fields: true,
				products: true,
				applicationFees: true,
			},
		});

		return newJob;
	} catch (error) {
		if (error instanceof Error) {
			throw new ApiError(httpStatus.CONFLICT, error.message);
		}
	}
};

// get job List by applicator
const getAllJobsByApplicator = async (applicatorId: number) => {
	try {
		const jobs = await prisma.job.findMany({
			where: {
				applicatorId,
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
					include: {
						field: {
							select: {
								name: true,
								acres: true,
							},
						},
					},
					omit: {
						createdAt: true,
						updatedAt: true,
					},
				},
				products: true,
				applicationFees: true,
			},
		}); // Fetch all users
		return jobs;
	} catch (error) {
		if (error instanceof Error) {
			// Handle generic errors
			throw new ApiError(
				httpStatus.CONFLICT,
				'Error while retreiving all jobs list.',
			);
		}
	}
};

// service for Job
const getJobById = async (jobId: number) => {
	try {
		const job = await prisma.job.findUnique({
			where: {
				id: jobId,
			},
			include: {
				fields: true,
				products: true,
				applicationFees: true,
			},
			omit: {
				applicatorId: true,
				growerId: true,
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
		return job;
	} catch (error) {
		if (error instanceof ApiError) {
			throw new ApiError(error.statusCode, error.message);
		}
		if (error instanceof Error) {
			// Handle generic errors or unexpected errors
			throw new ApiError(
				httpStatus.CONFLICT,
				'Error while retrieving JOB with this id.',
			);
		}
	}
};

// to delete job
const deleteJob = async (jobId: number) => {
	try {
		await prisma.job.delete({
			where: {
				id: jobId,
			},
		});

		return {
			message: 'Job deleted successfully.',
		};
	} catch (error) {
		if (error instanceof ApiError) {
			throw new ApiError(error.statusCode, error.message);
		}
		if (error instanceof Error) {
			throw new ApiError(
				httpStatus.CONFLICT,
				'Errror while deleting job.',
			);
		}
	}
};

const updateJobByApplicator = async (
	data: { status: JobStatus; fieldWorkerId: number },
	jobId: number,
) => {
	try {
		 await prisma.job.update({
			where: { id: jobId },
			data: {
				...data,
				status: data.status,
				fieldWorkerId: data.fieldWorkerId,
			},
		});

		return { message: 'Job updated successfully.' };
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError) {
			if (error.code === 'P2025') {
				// No record found
				throw new ApiError(httpStatus.NOT_FOUND, 'job not found.');
			}
		}
		if (error instanceof ApiError) {
			throw new ApiError(error.statusCode, error.message);
		}
		if (error instanceof Error) {
			throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, error.message);
		}
	}
};

// get pilots by applicator by Grower

const getAllPilotsByApplicator = async (applicatorId:number) => {
	try {
		const workers = await prisma.user.findMany({
			where:{
				// applicatorId,
				role:'WORKER'
			},
			select:{
				id:true,
				firstName:true,
				lastName:true,
				fullName:true
			}
		}); // Fetch all users
		return workers;
	} catch (error) {
		if (error instanceof Error) {
			// Handle generic errors
			throw new ApiError(
				httpStatus.CONFLICT,
				'Error while retreiving all workers list.',
			);
		}
	}
};

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

const getGrowerListForApplicator = async (applicatorId: number) => {
	try {
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
const getApplicatorListForGrower = async (growerId: number) => {
	try {
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
	} catch (error) {
		if (error instanceof Error) {
			// Handle generic errors
			throw new ApiError(
				httpStatus.CONFLICT,
				'Error while retreiving all workers list.',
			);
		}
	}
};

const getFarmListByGrowerID = async (
	applicatorId: number,
	growerId: number,
) => {
	try {
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
	} catch (error) {
		if (error instanceof Error) {
			throw new ApiError(
				httpStatus.NOT_FOUND,
				'Error while retrieving farms.',
			);
		}
	}
};

const uploadJobAttachments = async (
	userId: number,
	files: Express.Multer.File[],
) => {
	try {
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
	} catch (error) {
		if (error instanceof Error) {
			// Handle generic errors or unexpected errors
			console.log(error, 'error');

			throw new ApiError(
				httpStatus.CONFLICT,
				'Error while uploading attachments.',
			);
		}
	}
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
	getFarmListByGrowerID,
	uploadJobAttachments,
};
