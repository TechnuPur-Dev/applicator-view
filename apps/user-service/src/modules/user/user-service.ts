import httpStatus from 'http-status';
// import { Prisma } from '@prisma/client';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../../../../shared/libs/prisma-client';
import ApiError from '../../../../../shared/utils/api-error';
import { UpdateUser, UpdateStatus, UpdateArchiveStatus } from './user-types';
import config from '../../../../../shared/config/env-config';
import { BlobServiceClient, ContainerClient } from '@azure/storage-blob'; // Adjust based on Azure SDK usage
import { mailHtmlTemplate } from '../../../../../shared/helpers/node-mailer';
import { sendEmail } from '../../../../../shared/helpers/node-mailer';
import { hashPassword } from '../../helper/bcrypt';

const uploadProfileImage = async (
	userId: number,
	file: Express.Multer.File,
) => {
	const storageUrl = config.azureStorageUrl;
	const containerName = config.azureContainerName;

	const blobServiceClient =
		BlobServiceClient.fromConnectionString(storageUrl);
	const containerClient: ContainerClient =
		blobServiceClient.getContainerClient(containerName);

	// Generate unique blob names
	const blobName = `users/${userId}/profile/${uuidv4()}_${file.originalname}`;
	const thumbnailBlobName = `users/${userId}/profile/thumbnail_${uuidv4()}_${file.originalname}`;

	// Get original image dimensions
	const imageMetadata = await sharp(file.buffer).metadata();
	const originalWidth = imageMetadata.width || 0;
	const originalHeight = imageMetadata.height || 0;
	const thumbnailSize = Math.min(originalWidth, originalHeight);
	const left = Math.floor((originalWidth - thumbnailSize) / 2);
	const top = Math.floor((originalHeight - thumbnailSize) / 2);

	// Create and upload the original image
	const compressedImageBuffer = await sharp(file.buffer)
		.extract({ left, top, width: thumbnailSize, height: thumbnailSize })
		.resize({
			width: thumbnailSize,
			height: thumbnailSize,
			fit: 'cover',
		})
		.toBuffer();

	const blockBlobClient = containerClient.getBlockBlobClient(blobName);
	await blockBlobClient.upload(
		compressedImageBuffer,
		compressedImageBuffer.length,
		{
			blobHTTPHeaders: {
				blobContentType: file.mimetype,
			},
		},
	);

	// Create and upload the thumbnail
	const thumbnailBuffer = await sharp(file.buffer)
		.extract({ left, top, width: thumbnailSize, height: thumbnailSize })
		.resize({ width: 50, height: 50, fit: 'cover' })
		.toBuffer();

	const thumbnailBlobClient =
		containerClient.getBlockBlobClient(thumbnailBlobName);
	await thumbnailBlobClient.upload(thumbnailBuffer, thumbnailBuffer.length, {
		blobHTTPHeaders: {
			blobContentType: file.mimetype,
		},
	});

	return {
		profileImage: `/${containerName}/${blobName}`,
		thumbnailProfileImage: `/${containerName}/${thumbnailBlobName}`,
	};
};

// to update user profile
const updateProfile = async (data: UpdateUser, userId: number) => {
	let { password } = data;
	// hash the password only if it is provided
	if (password) {
		const hashedPassword = await hashPassword(data.password);
		password = hashedPassword;
	}
	console.log(password);

	const udpatedUser = await prisma.user.update({
		where: {
			id: userId,
		},
		data: {
			...data,
			password,
			profileStatus: 'COMPLETE',
		},
		omit: {
			password: true,
		},
	});
	return udpatedUser;
};

// service for user
const getUserByID = async (userId: number) => {
	const user = await prisma.user.findUnique({
		where: {
			id: userId,
		},
		omit: {
			password: true,
		},
	});
	// Check if user is null
	if (!user) {
		throw new ApiError(
			httpStatus.NOT_FOUND,
			'A user with this id does not exist.',
		);
	}
	return user;
};

// to delete Use
const deleteUser = async (userId: number) => {
	await prisma.user.delete({
		where: {
			id: userId,
		},
	});

	return {
		message: 'User deleted successfully.',
	};
};

// get user List
const getAllUsers = async () => {
	const users = await prisma.user.findMany(); // Fetch all users
	return users;
};

// getUserByEmail
const getGrowerByEmail = async (userEmail: string) => {
	const grower = await prisma.user.findFirst({
		where: {
			email: {
				equals: userEmail,
				mode: 'insensitive',
			},
			role: 'GROWER',
		},
		omit: {
			password: true,
		},
	});
	if (!grower) {
		throw new ApiError(
			httpStatus.CONFLICT,
			'Grower with this email not found.',
		);
	}

	return grower;
};

// create grower
const createGrower = async (data: UpdateUser, userId: number) => {
	const { firstName, lastName } = data;

	const [grower] = await prisma.$transaction(async (prisma) => {
		const grower = await prisma.user.create({
			data: {
				...data,
				fullName: `${firstName} ${lastName}`,
				role: 'GROWER',
			},
			omit: {
				password: true,
			},
		});

		await prisma.applicatorGrower.create({
			data: {
				applicatorId: userId,
				growerId: grower.id,
				growerFirstName: firstName,
				growerLastName: lastName,
			},
		});

		return [grower];
	});

	return grower;
};

const getAllGrowersByApplicator = async (applicatorId: number) => {
	// Fetch growers with their farms and fields
	const growers = await prisma.applicatorGrower.findMany({
		where: {
			applicatorId,
		},
		select: {
			growerFirstName: true,
			growerLastName: true,
			inviteStatus: true,
			isArchivedByApplicator: true,
			grower: {
				include: {
					farms: {
						where: {
							permissions: {
								some: {
									applicatorId,
								},
							},
						},
						include: {
							permissions: true,
							fields: true,
						},
					},
				},
				omit: {
					password: true,
					businessName: true,
					experience: true,
				},
			},
		},
	});

	// Calculate total acres for each grower
	const enrichedGrowers = growers.map((grower) => {
		const totalAcresByGrower = grower.grower?.farms.reduce(
			(totalGrowerAcres, farm) => {
				const totalAcresByFarm = farm.fields.reduce(
					(totalFarmAcres, field) => {
						return (
							totalFarmAcres +
							parseFloat(field.acres?.toString() || '0')
						);
					},
					0,
				);
				return totalGrowerAcres + totalAcresByFarm;
			},
			0,
		);

		// Return the grower object without farms
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { farms, ...growerWithoutFarms } = grower.grower || {};

		return {
			...grower,
			grower: {
				...growerWithoutFarms,
			},
			totalAcres: totalAcresByGrower,
		};
	});

	return enrichedGrowers;
};

const getAllApplicatorsByGrower = async (growerId: number) => {
	// Fetch applicators
	const applicators = await prisma.applicatorGrower.findMany({
		where: {
			growerId,
		},
		select: {
			applicatorFirstName: true,
			applicatorLastName: true,
			inviteStatus: true,
			isArchivedByGrower: true,
			canManageFarms: true,
			applicator: {
				omit: {
					password: true, // Exclude sensitive data
				},
			},
		},
	});

	return applicators;
};
const updateInviteStatus = async (data: UpdateStatus) => {
	// Destructure
	const { status, applicatorId, growerId } = data;

	if (status === 'ACCEPTED') {
		// Update the inviteStatus field
		await prisma.applicatorGrower.update({
			where: {
				applicatorId_growerId: {
					applicatorId,
					growerId,
				},
			},
			data: {
				inviteStatus: status, // Only updating the inviteStatus field
			},
		});
		return {
			message: 'Invite accepted successfully.',
		};
	}
	if (status === 'REJECTED') {
		// Update the inviteStatus field
		await prisma.applicatorGrower.update({
			where: {
				applicatorId_growerId: {
					applicatorId,
					growerId,
				},
			},
			data: {
				inviteStatus: status, // Only updating the inviteStatus field
			},
		});

		return {
			message: 'Invite rejected successfully.',
		};
	}
};
// delete grower

const deleteGrower = async (growerId: number, applicatorId: number) => {
	await prisma.applicatorGrower.delete({
		where: {
			applicatorId_growerId: {
				growerId,
				applicatorId,
			},
		},
	});

	return {
		message: 'Grower deleted successfully',
	};
};

const getPendingInvites = async (userId: number) => {
	const pendingInvites = await prisma.applicatorGrower.findMany({
		where: {
			OR: [{ applicatorId: userId }, { growerId: userId }],
			inviteStatus: 'PENDING',
		},
		include: {
			grower: {
				omit: {
					password: true,
				},
			},
			applicator: {
				omit: {
					password: true,
				},
			},
		},
	});

	return pendingInvites;
};

const updateArchivedStatus = async (data: UpdateArchiveStatus, Id: number) => {
	// Destructure
	const { userId, role, archiveStatus, canManageFarmsStauts } = data;
	// Applicator updating Grower
	if (role === 'APPLICATOR') {
		const userExist = await prisma.applicatorGrower.findFirst({
			where: {
				applicatorId: Id,
				growerId: userId, //grower id get from frontend
			},
		});

		if (!userExist) {
			throw new ApiError(
				httpStatus.NOT_FOUND,
				'User relation not found.',
			);
		}
		await prisma.applicatorGrower.update({
			where: {
				id: userExist.id,
			},
			data: {
				isArchivedByApplicator: archiveStatus, // Only updating the inviteStatus field
			},
		});
		return {
			message: 'Archived status Updated Successfully',
		};
	}
	//grower update applicator
	else {
		{
			const userExist = await prisma.applicatorGrower.findFirst({
				where: {
					applicatorId: userId, //now applicator id get from frontend
					growerId: Id,
				},
			});

			if (!userExist) {
				throw new ApiError(
					httpStatus.NOT_FOUND,
					'User relation not found.',
				);
			}
			console.log(userExist, 'userExist');
			await prisma.applicatorGrower.update({
				where: {
					id: userExist.id,
				},
				data: {
					isArchivedByGrower: archiveStatus, // Only updating the isArchivedByGrower field
					canManageFarms: canManageFarmsStauts,
				},
			});

			return {
				message: 'Archived status Updated Successfully',
			};
		}
	}
};

const sendInviteToApplicator = async (
	applicatorId: number,
	growerId: number,
) => {
	// Update the inviteStatus field
	const user = await prisma.applicatorGrower.update({
		where: {
			applicatorId_growerId: {
				applicatorId,
				growerId,
			},
		},
		include: {
			// Move include here
			applicator: {
				select: {
					email: true,
				},
			},
		},
		data: {
			inviteStatus: 'PENDING', // Only updating the inviteStatus field
		},
	});

	const subject = 'Email Invitation';
	const message = `
You are invited to join our platform!<br><br>
If you did not expect this invitation, please ignore this email.
`;
	if (user) {
		const email = user?.applicator?.email;

		if (!email) {
			throw new Error('Email address is not available for the grower.');
		}

		const html = await mailHtmlTemplate(subject, message);

		await sendEmail({
			emailTo: email,
			subject,
			text: 'Request Invitation',
			html,
		});
		return {
			message: 'Invite sent successfully.',
		};
	}
};
const sendInviteToGrower = async (applicatorId: number, growerId: number) => {
	// Update the inviteStatus field
	const user = await prisma.applicatorGrower.update({
		where: {
			applicatorId_growerId: {
				applicatorId,
				growerId,
			},
		},
		include: {
			// Move include here
			grower: {
				select: {
					email: true,
				},
			},
		},
		data: {
			inviteStatus: 'PENDING', // Only updating the inviteStatus field
		},
	});

	const subject = 'Email Invitation';
	const message = `
  You are invited to join our platform!<br><br>
  If you did not expect this invitation, please ignore this email.
`;
	if (user) {
		const email = user?.grower?.email;

		if (!email) {
			throw new Error('Email address is not available for the grower.');
		}

		const html = await mailHtmlTemplate(subject, message);

		await sendEmail({
			emailTo: email,
			subject,
			text: 'Request Invitation',
			html,
		});
		return {
			message: 'Invite sent successfully.',
		};
	}
};
// service for user
const getGrowerById = async (applicatorId: number, growerId: number) => {
	// Fetch growers with their farms and fields
	const grower = await prisma.applicatorGrower.findUnique({
		where: {
			applicatorId_growerId: {
				applicatorId,
				growerId,
			},
		},
		select: {
			growerFirstName: true,
			growerLastName: true,
			inviteStatus: true,
			isArchivedByApplicator: true,
			grower: {
				include: {
					farms: {
						where: {
							permissions: {
								some: {
									applicatorId,
								},
							},
						},
						include: {
							permissions: true, // Include permissions to calculate farm permissions for the applicator
							fields: true, // Include fields to calculate total acres
						},
					},
				},
				omit: {
					password: true, // Exclude sensitive data
					businessName: true,
					experience: true,
				},
			},
		},
	});

	// Calculate total acres for each grower and each farm

	const totalAcresByGrower = grower?.grower?.farms.reduce(
		(totalGrowerAcres, farm) => {
			// Calculate total acres for this farm
			const totalAcresByFarm = farm.fields.reduce(
				(totalFarmAcres, field) => {
					return (
						totalFarmAcres +
						parseFloat(field.acres?.toString() || '0')
					);
				},
				0,
			);

			// Type assertion to inform TypeScript about `totalAcres`
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(farm as any).totalAcres = totalAcresByFarm;

			// Accumulate total grower acres
			return totalGrowerAcres + totalAcresByFarm;
		},
		0,
	);

	// Add total acres to the grower object
	return {
		...grower,
		totalAcres: totalAcresByGrower,
	};
};

export default {
	uploadProfileImage,
	updateProfile,
	getUserByID,
	deleteUser,
	getAllUsers,
	getGrowerByEmail,
	createGrower,
	getAllGrowersByApplicator,
	getAllApplicatorsByGrower,
	updateInviteStatus,
	getPendingInvites,
	deleteGrower,
	updateArchivedStatus,
	sendInviteToApplicator,
	sendInviteToGrower,
	getGrowerById,
};
