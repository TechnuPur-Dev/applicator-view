import httpStatus from 'http-status';
// import { Prisma } from '@prisma/client';

import ApiError from '../../../../../shared/utils/api-error';
import { prisma } from '../../../../../shared/libs/prisma-client';
import { CreateFarmParams, AssignFarmPermission } from './farm-types';
import { User } from './../../../../../shared/types/global';
import { mailHtmlTemplate } from '../../../../../shared/helpers/node-mailer';
import { sendEmail } from '../../../../../shared/helpers/node-mailer';
const createFarm = async (
	user: User,
	growerId: number,
	data: CreateFarmParams,
) => {
	const { role, id: userId } = user;

	const farmData = {
		...data,
		createdById: userId,
		growerId,
	};

	if (role === 'GROWER') {
		return prisma.farm.create({ data: farmData });
	}

	if (role === 'APPLICATOR') {
		const grower = await prisma.applicatorGrower.findUnique({
			where: {
				applicatorId_growerId: {
					applicatorId: userId,
					growerId,
				},
			},
			select: { canManageFarms: true },
		});

		if (!grower?.canManageFarms) {
			throw new ApiError(
				httpStatus.UNAUTHORIZED,
				'You are not authorized to add a farm for this grower.',
			);
		}

		return prisma.farm.create({
			data: {
				...farmData,
				permissions: {
					create: {
						applicatorId: userId,
						canView: true,
						canEdit: true,
					},
				},
			},
		});
	}

	throw new ApiError(httpStatus.FORBIDDEN, 'Invalid user role.');
};

const getAllFarmsByGrower = async (growerId: number) => {
	const farms = await prisma.farm.findMany({
		where: {
			growerId,
		},
		include: {
			fields: true, // Include related fields in the result
			permissions: {
				include: {
					applicator: {
						select: {
							id: true,
							profileImage: true,
							thumbnailProfileImage: true,
							firstName: true,
							lastName: true,
							fullName: true,
						},
					},
				},
			},
		},
		orderBy: {
			createdAt: 'desc',
		},
	}); // Fetch all users
	// Calculate total acres for each grower and each farm
	const enrichedFarms = farms.map((farm) => {
		const totalAcresByFarm = farm.fields.reduce((totalFarmAcres, field) => {
			return totalFarmAcres + parseFloat(field.acres?.toString() || '0');
		}, 0);

		// Add total acres to the grower object
		return {
			...farm,
			totalAcres: totalAcresByFarm,
		};
	});
	return enrichedFarms;
};
const getFarmById = async (Id: number) => {
	const farm = await prisma.farm.findUnique({
		where: {
			id: Id,
		},
		include: {
			fields: true, // Include related fields in the result
		},
	});
	console.log(farm, 'farm');
	if (!farm) {
		throw new ApiError(
			httpStatus.NOT_FOUND,
			'Farm with this ID not found.',
		);
	}
	return farm;
};

const deleteFarm = async (Id: number) => {
	await prisma.farm.delete({
		where: {
			id: Id,
		},
	});

	return {
		message: 'Farm deleted successfully.',
	};
};
const updateFarm = async (farmId: number, data: CreateFarmParams) => {
	// Validate farm existence
	const farm = await prisma.farm.findUnique({
		where: { id: farmId },
		select: { id: true },
	});
	if (!farm) {
		throw new ApiError(httpStatus.NOT_FOUND, 'Farm not found.');
	}
	console.log(farm, 'farm');
	// Update farm
	const updatedFarm = await prisma.farm.update({
		where: { id: farmId },
		data,
	});

	return updatedFarm;
};

const assignFarmPermission = async (data: AssignFarmPermission) => {
	const { farmId, applicatorId, canView, canEdit } = data;

	// Validate farm existence
	const farm = await prisma.farm.findUnique({
		where: { id: farmId },
		select: { id: true },
	});
	if (!farm) {
		throw new ApiError(httpStatus.NOT_FOUND, 'Farm not found.');
	}
	console.log(farm, 'farm');
	// Update farm
	const permission = await prisma.farmPermission.create({
		data: { farmId, applicatorId, canView, canEdit },
	});

	return permission;
};
const updateFarmPermission = async (
	permissionId: number,
	data: AssignFarmPermission,
) => {
	// Update farm
	const updatedPermission = await prisma.farmPermission.update({
		where: { id: permissionId },
		data,
	});

	return updatedPermission;
};
const deleteFarmPermission = async (permissionId: number) => {
	// Update farm
	await prisma.farmPermission.delete({
		where: { id: permissionId },
	});

	return {
		message: 'Farm permission deleted successfully.',
	};
};
const askFarmPermission = async (email: string) => {
	console.log(email, 'req.body');

	const isEmailExist = await prisma.user.findFirst({
		where: {
			email: {
				equals: email,
				mode: 'insensitive',
			},
			profileStatus: 'COMPLETE',
		},
		select: {
			id: true, // Omit password from the response to prevent exposing it to clients
		},
	});

	if (!isEmailExist) {
		throw new ApiError(
			httpStatus.NOT_FOUND,
			'An account with this email not exists.',
		);
	}

	const subject = 'Request For Farm Permissions';
	const message = `
		You have received a request for farm access permissions.<br><br>
		To grant access, please review and approve the request.<br><br>
		If you did not initiate this request, please ignore this email.<br><br>
		Thank you.
	  `;
	const html = await mailHtmlTemplate(subject, message);
	await sendEmail({
		emailTo: email,
		subject,
		text: 'Request Verification',
		html,
	});
	return {
		message:
			'Request email for permission has been sent to the user Succesfully',
	};
};

export default {
	createFarm,
	getAllFarmsByGrower,
	getFarmById,
	deleteFarm,
	updateFarm,
	assignFarmPermission,
	updateFarmPermission,
	deleteFarmPermission,
	askFarmPermission,
};
