import httpStatus from 'http-status';
// import { Prisma } from '@prisma/client';
// import sharp from 'sharp';
// import { v4 as uuidv4 } from 'uuid';
import { JobStatus } from '@prisma/client';
import { prisma } from '../../../../../shared/libs/prisma-client';
import ApiError from '../../../../../shared/utils/api-error';
import { CreateJob } from './job-types';
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
			fields, // Array of { fieldId, actualAcres }
			products, // Array of { name, ratePerAcre, totalAcres, price }
			applicationFees, // Array of { description, rateUoM, perAcre }
		} = data;

		const [newJob] = await prisma.$transaction(async (prisma) => {
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
				},
			});
			if (fields && fields.length > 0) {
				await prisma.fieldJob.createMany({
					data: fields.map(
						(field: { fieldId: number; actualAcres?: number }) => ({
							fieldId: field.fieldId,
							jobId: newJob.id,
							actualAcres: field.actualAcres,
						}),
					),
				});
			}

			// Add Products
			if (products && products.length > 0) {
				await prisma.jobProduct.createMany({
					data: products.map(
						(product: {
							name: string;
							ratePerAcre: number;
							totalAcres: number;
							price: number;
						}) => ({
							jobId: newJob.id,
							name: product.name,
							ratePerAcre: product.ratePerAcre,
							totalAcres: product.totalAcres,
							price: product.price,
						}),
					),
				});
			}

			// Add Application Fees
			if (applicationFees && applicationFees.length > 0) {
				await prisma.jobApplicationFee.createMany({
					data: applicationFees.map(
						(fee: {
							description: string;
							rateUoM: number;
							perAcre: boolean;
						}) => ({
							jobId: newJob.id,
							description: fee.description,
							rateUoM: fee.rateUoM,
							perAcre: fee.perAcre,
						}),
					),
				});
			}
			return [newJob];
		});

		return newJob;
	} catch (error) {
		if (error instanceof Error) {
			// Handle generic errors
			throw new ApiError(httpStatus.CONFLICT, error.message);
		}
	}
};

// get job List by applicator
const getAllJobsByApplicator = async (applicatorId:number) => {
	try {
		const jobs = await prisma.job.findMany({
			where:{
				applicatorId
			},
			include:{
				fields:true,
				products:true,
				applicationFees:true
			}
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
				farmId:true,
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
			message: 'job deleted successfully.',
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

const updateJobByApplicator = async (data:{status:JobStatus, fieldWorkerId:number}, jobId: number) => {
	try {
		const job = await prisma.job.update({
			where: { id:jobId },
			data:{
				...data,
				status:data.status,
				fieldWorkerId:data.fieldWorkerId
			}
		});
           if(!job){
			throw new ApiError(
				httpStatus.NOT_FOUND,
				'No job found for the given id.',
			);
		   }

		return { message: 'Job updated successfully.' };
	} catch (error) {
		if (error instanceof ApiError) {
			throw new ApiError(
			       error.statusCode, error.message,
			);
		}
		if (error instanceof Error) {
			throw new ApiError(
				httpStatus.INTERNAL_SERVER_ERROR,
				error.message,
			);
		}
		
	}
};


// get pilots by applicator by Grower

// const getAllPilotsByApplicator = async (applicatorId:number) => {
// 	try {
// 		const workers = await prisma.user.findMany({
// 			where:{
// 				applicatorId,
// 				role:'WORKER'
// 			},
// 			select:{
// 				id:true,
// 				firstName:true,
// 				lastName:true,
// 				fullName:true
// 			}
// 		}); // Fetch all users
// 		return workers;
// 	} catch (error) {
// 		if (error instanceof Error) {
// 			// Handle generic errors
// 			throw new ApiError(
// 				httpStatus.CONFLICT,
// 				'Error while retreiving all workers list.',
// 			);
// 		}
// 	}
// };
export default {
	createJob,
	getAllJobsByApplicator,
	getJobById,
	deleteJob,
	updateJobByApplicator,
	// getAllPilotsByApplicator
	
};
