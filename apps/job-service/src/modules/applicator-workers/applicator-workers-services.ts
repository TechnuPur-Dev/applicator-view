import httpStatus from 'http-status';
// import { Prisma } from '@prisma/client';
import { prisma } from '../../../../../shared/libs/prisma-client';
import { ApplicatorWorker } from './applicator-workers-types';
import ApiError from '../../../../../shared/utils/api-error';
//

const createWorker = async (data: ApplicatorWorker, applicatorId: number) => {
	const {
	
		firstName,
		lastName,
		email,
		phoneNumber,
		businessName,
		address1,
		address2,
		state,
		county,
		township,
		zipCode,
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
	
	} = data;
	const workerExist = await prisma.user.findFirst({
		where: {
			email: {
				equals: email,
				mode: 'insensitive',
			},
		},
	});
	if (workerExist) {
		throw new ApiError(
			httpStatus.CONFLICT,
			'user with this email already exist.',
		);
	}
	const [worker, applicatorWorker] = await prisma.$transaction(async (prisma) => {
		const worker = await prisma.user.create({
			data: {
				firstName,
				lastName,
				fullName: `${firstName} ${lastName}`,
				email,
				phoneNumber,
				businessName,
				address1,
				address2,
				state,
				county,
				township,
				zipCode,
				role: 'WORKER',
			},
			omit: {
				profileImage:true,
				thumbnailProfileImage:true,
				password: true, // Exclude sensitive data
				experience: true,
				bio: true,
				additionalInfo: true,
				profileStatus: true,
			},
		});

		const applicatorWorker = await prisma.applicatorWorker.create({
			data: {
				applicatorId: applicatorId,
				workerId: worker.id,
				workerType: title,
				pilotLicenseNumber: pilotLicenseNumber,
				businessLicenseNumber: businessLicenseNumber,
				planeOrUnitNumber: planeOrUnitNumber,
				perAcrePricing: perAcrePricing,
				percentageFee: percentageFee,
				dollarPerAcre: dollarPerAcre,
				autoAcceptJobs: autoAcceptJobs || false,
				canViewPricingDetails: canViewPricingDetails || false,
				code: code,
				lastLogin: lastLogin,
			},
		});

		return [worker,applicatorWorker];
	});

	return {worker,applicatorWorker:applicatorWorker};
};
const getAllWorker = async (applicatorId: number) => {
	const workers = await prisma.applicatorWorker.findMany({
		where: {
			applicatorId: applicatorId,
		},
		include: {
			worker: {
				omit: {
					profileImage:true,
					thumbnailProfileImage:true,
					password: true, // Exclude sensitive data
					experience: true,
					bio: true,
					additionalInfo: true,
					profileStatus: true,
					createdAt:true,
					updatedAt:true
				},
			},
		},
	});
	return workers;
};
const getWorkerById = async (Id: number) => {
	const workers = await prisma.applicatorWorker.findFirst({
		where: {
			workerId: Id
		},
		include: {
			worker: {
				omit: {
					profileImage:true,
					thumbnailProfileImage:true,
					password: true, // Exclude sensitive data
					experience: true,
					bio: true,
					additionalInfo: true,
					profileStatus: true,
					createdAt:true,
					updatedAt:true
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
				...userData
			},
		});

     const applicatorWorker	=await prisma.applicatorWorker.updateMany({
			where: {
			      workerId,
			},
			data: {
				workerType:title,
				pilotLicenseNumber,
				businessLicenseNumber,
				planeOrUnitNumber,
				perAcrePricing,
				percentageFee,
				dollarPerAcre,
				autoAcceptJobs,
				canViewPricingDetails,
				code,
				lastLogin
			},
		});

		return [worker,applicatorWorker];
	});

	return {message:"updated successfully"};
};
const deleteWorker = async (Id: number) => {
	await prisma.applicatorWorker.delete({
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
