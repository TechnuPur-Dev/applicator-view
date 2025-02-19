import httpStatus from 'http-status';
// import { Prisma } from '@prisma/client';
import { prisma } from '../../../../../shared/libs/prisma-client';
import { ApplicatorWorker } from './applicator-workers-types';
import ApiError from '../../../../../shared/utils/api-error';
import { User } from '../../../../../shared/types/global';
//

const createWorker = async (user: User, data: ApplicatorWorker) => {
	if (user.role !== 'APPLICATOR') {
		throw new ApiError(
			httpStatus.UNAUTHORIZED,
			'You are not authorized to perform this action.',
		);
	}

	const workerExist = await prisma.user.findFirst({
		where: {
			email: {
				equals: data.email,
				mode: 'insensitive',
			},
		},
	});

	if (workerExist) {
		throw new ApiError(
			httpStatus.CONFLICT,
			'Invalid data or already exists.',
		);
	}

	return prisma.$transaction(async (prisma) => {
		const worker = await prisma.user.create({
			data: {
				firstName: data.firstName,
				lastName: data.lastName,
				fullName: `${data.firstName} ${data.lastName}`,
				email: data.email.toLowerCase(),
				phoneNumber: data.phoneNumber,
				businessName: data.businessName,
				address1: data.address1,
				address2: data.address2,
				stateId: data.stateId,
				county: data.county,
				township: data.township,
				zipCode: data.zipCode,
				role: 'WORKER',
			},
			omit: {
				password: true, // Exclude sensitive data
				experience: true,
				bio: true,
				additionalInfo: true,
				profileStatus: true,
			},
		});

		const applicatorWorker = await prisma.applicatorWorker.create({
			data: {
				applicatorId: user.id,
				workerId: worker.id,
				workerType: data.title,
				pilotLicenseNumber: data.pilotLicenseNumber,
				businessLicenseNumber: data.businessLicenseNumber,
				planeOrUnitNumber: data.planeOrUnitNumber,
				perAcrePricing: data.perAcrePricing,
				percentageFee: data.percentageFee,
				dollarPerAcre: data.dollarPerAcre,
				autoAcceptJobs: data.autoAcceptJobs ?? false,
				canViewPricingDetails: data.canViewPricingDetails ?? false,
				code: data.code,
				lastLogin: new Date(), // Set current timestamp if null/undefined
			},
		});

		return { ...worker, ...applicatorWorker };
	});
};

const getAllWorker = async (applicatorId: number) => {
	const workers = await prisma.applicatorWorker.findMany({
		where: {
			applicatorId: applicatorId,
		},
		include: {
			worker: {
				omit: {
					profileImage: true,
					thumbnailProfileImage: true,
					password: true, // Exclude sensitive data
					experience: true,
					bio: true,
					additionalInfo: true,
					profileStatus: true,
					createdAt: true,
					updatedAt: true,
				},
			},
		},
	});
	return workers;
};
const getWorkerById = async (Id: number) => {
	const workers = await prisma.applicatorWorker.findFirst({
		where: {
			workerId: Id,
		},
		include: {
			worker: {
				omit: {
					profileImage: true,
					thumbnailProfileImage: true,
					password: true, // Exclude sensitive data
					experience: true,
					bio: true,
					additionalInfo: true,
					profileStatus: true,
					createdAt: true,
					updatedAt: true,
				},
			},
		},
	});
	return workers;
};
const updateWorker = async (workerId: number, data: ApplicatorWorker) => {
	const {
		title,
		pilotLicenseNumber,
		businessLicenseNumber,
		planeOrUnitNumber,
		perAcrePricing,
		percentageFee,
		dollarPerAcre,
		autoAcceptJobs,
		canViewPricingDetails,
		code,
		lastLogin,
		...userData
		// Remaining fields for applicatorWorker
	} = data;
	await prisma.$transaction(async (prisma) => {
		const worker = await prisma.user.update({
			where: {
				id: workerId, // update worker in user model with their Id
			},
			data: {
				...userData,
			},
		});

		const applicatorWorker = await prisma.applicatorWorker.updateMany({
			where: {
				workerId,
			},
			data: {
				workerType: title,
				pilotLicenseNumber,
				businessLicenseNumber,
				planeOrUnitNumber,
				perAcrePricing,
				percentageFee,
				dollarPerAcre,
				autoAcceptJobs,
				canViewPricingDetails,
				code,
				lastLogin,
			},
		});

		return [worker, applicatorWorker];
	});

	return { message: 'updated successfully' };
};
const deleteWorker = async (Id: number) => {
	await prisma.user.delete({
		where: {
			id: Id,
		},
	});
	return { result: 'Deleted successfully' };
};
export default {
	createWorker,
	getAllWorker,
	getWorkerById,
	updateWorker,
	deleteWorker,
};
