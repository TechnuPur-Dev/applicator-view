import httpStatus from 'http-status';
// import { Prisma } from '@prisma/client';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { prisma } from '../../../../../shared/libs/prisma-client';
import ApiError from '../../../../../shared/utils/api-error';
import { UpdateUser, UpdateStatus, UpdateArchiveStatus } from './user-types';
import config from '../../../../../shared/config/env-config';
import { BlobServiceClient, ContainerClient } from '@azure/storage-blob'; // Adjust based on Azure SDK usage
import { mailHtmlTemplate } from '../../../../../shared/helpers/node-mailer';
import { sendEmail } from '../../../../../shared/helpers/node-mailer';
import { hashPassword } from '../../helper/bcrypt';
import {
	PaginateOptions,
	User,
	city,
} from '../../../../../shared/types/global';
import { generateInviteToken, verifyInvite } from '../../helper/invite-token';
import { InviteStatus } from '@prisma/client';
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
	const { firstName, lastName } = data;
	// hash the password only if it is provided
	if (password) {
		const hashedPassword = await hashPassword(data.password);
		password = hashedPassword;
	}
	// Construct fullName if firstName or lastName is updated
	let fullName: string | undefined;
	if (firstName || lastName) {
		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: { firstName: true, lastName: true },
		});
		fullName =
			`${firstName || user?.firstName || ''} ${lastName || user?.lastName || ''}`.trim();
	}

	const udpatedUser = await prisma.user.update({
		where: {
			id: userId,
		},
		data: {
			...data,
			password,
			fullName,
			profileStatus: 'COMPLETE',
		},
		include: {
			state: {
				select: {
					id: true,
					name: true,
				},
			},
		},
		omit: {
			password: true,
			stateId: true,
		},
	});
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const { state } = udpatedUser; // Exclude password
	return {
		...udpatedUser,
		state: state?.name,
	};
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
		skip,
		take: limit,
		orderBy: {
			id: 'desc',
		},
	}); // Fetch all users
	const totalResults = await prisma.user.count();

	const totalPages = Math.ceil(totalResults / limit);
	// Return the paginated result including users, current page, limit, total pages, and total results
	return {
		result: users,
		page,
		limit,
		totalPages,
		totalResults,
	};
};

// getUserByEmail
const getGrowerByEmail = async (applicatorId: number, userEmail: string) => {
	const grower = await prisma.user.findFirst({
		where: {
			email: {
				equals: userEmail,
				mode: 'insensitive',
			},
			role: 'GROWER',
		},
		include: {
			state: {
				select: {
					id: true,
					name: true,
				},
			},
			farms: {
				include: {
					state: {
						select: {
							id: true,
							name: true,
						},
					},
					permissions: {
						where: {
							applicatorId,
						},
					}, // Include permissions to calculate farm permissions for the applicator
					fields: true, // Include fields to calculate total acres
				},
				orderBy: {
					id: 'desc',
				},
			},
		},
		omit: {
			password: true, // Exclude sensitive data
			businessName: true,
			experience: true,
		},
	});
	if (!grower) {
		throw new ApiError(
			httpStatus.CONFLICT,
			'Grower with this email not found.',
		);
	}

	// Calculate total acres for each grower and each farm

	const totalAcresByGrower = grower?.farms.reduce(
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

// create grower
const createGrower = async (data: UpdateUser, userId: number) => {
	const { firstName, lastName } = data;
	// Generate Token
	const token = generateInviteToken('GROWER');
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
				inviteStatus: 'PENDING',
				inviteInitiator: 'APPLICATOR',
				inviteToken: token,
			},
		});

		return [grower];
	});
	const inviteLink = `https://grower-ac.netlify.app/#/invitationView?token=${token}`;
	const subject = 'Invitation Email';
	const message = `
  You are invited to join our platform!<br><br>
  Click the link below to join.<br><br>
  ${inviteLink}<br><br>
  If you did not expect this invitation, please ignore this email.
`;
	// Construct invite link

	const html = await mailHtmlTemplate(subject, message);

	await sendEmail({
		emailTo: data.email,
		subject,
		text: 'Request Invitation',
		html,
	});

	return grower;
};

const getAllGrowersByApplicator = async (
	applicatorId: number,
	options: PaginateOptions,
) => {
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
					state: {
						select: {
							id: true,
							name: true,
						},
					},
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
							state: {
								select: {
									id: true,
									name: true,
								},
							},
						},
					},
				},
				omit: {
					password: true,
					businessName: true,
					experience: true,
					stateId: true,
				},
			},
		},
		skip,
		take: limit,
		orderBy: {
			id: 'desc',
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
	const totalResults = await prisma.applicatorGrower.count({
		where: {
			applicatorId,
		},
	});

	const totalPages = Math.ceil(totalResults / limit);
	// Return the paginated result including users, current page, limit, total pages, and total results
	return {
		result: enrichedGrowers,
		page,
		limit,
		totalPages,
		totalResults,
	};
};

const getAllApplicatorsByGrower = async (
	growerId: number,
	options: PaginateOptions,
) => {
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
				include: {
					state: {
						select: {
							id: true,
							name: true,
						},
					},
				},
				omit: {
					stateId: true,
					password: true, // Exclude sensitive data
				},
			},
		},
		skip,
		take: limit,
		orderBy: {
			id: 'desc',
		},
	});
	const totalResults = await prisma.applicatorGrower.count({
		where: {
			growerId,
		},
	});

	const totalPages = Math.ceil(totalResults / limit);
	// Return the paginated result including users, current page, limit, total pages, and total results
	return {
		result: applicators,
		page,
		limit,
		totalPages,
		totalResults,
	};
};
const updateInviteStatus = async (user: User, data: UpdateStatus) => {
	// Destructure
	const { id: userId, role } = user;
	const { status, userId: targetUserId } = data;

	// Determine the applicatorId and growerId based on the role
	const isGrower = role === 'GROWER';
	const applicatorId = isGrower ? targetUserId : userId;
	const growerId = isGrower ? userId : targetUserId;

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
const deleteApplicator = async (growerId: number, applicatorId: number) => {
	await prisma.applicatorGrower.delete({
		where: {
			applicatorId_growerId: {
				growerId,
				applicatorId,
			},
		},
	});

	return {
		message: 'applicator deleted successfully',
	};
};

const getPendingInvites = async (user: User, options: PaginateOptions) => {
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
	if (user.role === 'APPLICATOR') {
		const pendingInvites = await prisma.applicatorGrower.findMany({
			where: {
				applicatorId: user.id,
				inviteStatus: 'PENDING',
				inviteInitiator: 'GROWER', // user who sent invite to join platform
			},
			select: {
				growerFirstName: true,
				growerLastName: true,
				inviteStatus: true,
				isArchivedByApplicator: true,
				grower: {
					include: {
						state: {
							select: {
								id: true,
								name: true,
							},
						},
						farms: {
							where: {
								permissions: {
									some: {
										applicatorId: user.id,
									},
								},
							},
							include: {
								permissions: true,
								fields: true,
								state: {
									select: {
										id: true,
										name: true,
									},
								},
							},
						},
					},
					omit: {
						password: true,
						businessName: true,
						experience: true,
						stateId: true,
					},
				},
			},
			skip,
			take: limit,
			orderBy: {
				id: 'desc',
			},
		});
		// Calculate total acres for each grower
		const enrichedGrowers = pendingInvites.map((grower) => {
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
		const totalResults = await prisma.applicatorGrower.count({
			where: {
				applicatorId: user.id,
				inviteStatus: 'PENDING',
				inviteInitiator: 'GROWER', // user who sent invite to join platform
			},
		});
		const totalPages = Math.ceil(totalResults / limit);
		return {
			result: enrichedGrowers,
			page,
			limit,
			totalPages,
			totalResults,
		};
	}
	if (user.role === 'GROWER') {
		const pendingInvites = await prisma.applicatorGrower.findMany({
			where: {
				growerId: user.id,
				inviteStatus: 'PENDING',
				inviteInitiator: 'APPLICATOR', // user who sent invite to join platform
			},
			select: {
				applicatorFirstName: true,
				applicatorLastName: true,
				inviteStatus: true,
				isArchivedByGrower: true,
				applicator: {
					include: {
						state: {
							select: {
								id: true,
								name: true,
							},
						},
						farms: {
							include: {
								permissions: true,
								fields: true,
								state: {
									select: {
										id: true,
										name: true,
									},
								},
							},
						},
					},
					omit: {
						password: true,
						businessName: true,
						experience: true,
						stateId: true,
					},
				},
			},
			skip,
			take: limit,
			orderBy: {
				id: 'desc',
			},
		});
		// Calculate total acres for each grower
		const enrichedApplicators = pendingInvites.map((applicator) => {
			const totalAcresByGrower = applicator.applicator?.farms.reduce(
				(totalApplicatorAcres, farm) => {
					const totalAcresByFarm = farm.fields.reduce(
						(totalFarmAcres, field) => {
							return (
								totalFarmAcres +
								parseFloat(field.acres?.toString() || '0')
							);
						},
						0,
					);
					return totalApplicatorAcres + totalAcresByFarm;
				},
				0,
			);

			// Return the grower object without farms
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const { farms, ...growerWithoutFarms } =
				applicator.applicator || {};

			return {
				...applicator,
				grower: {
					...growerWithoutFarms,
				},
				totalAcres: totalAcresByGrower,
			};
		});

		const totalResults = await prisma.applicatorGrower.count({
			where: {
				growerId: user.id,
				inviteStatus: 'PENDING',
				inviteInitiator: 'APPLICATOR', // user who sent invite to join platform
			},
		});
		const totalPages = Math.ceil(totalResults / limit);
		return {
			result: enrichedApplicators,
			page,
			limit,
			totalPages,
			totalResults,
		};
	}
};

const updateArchivedStatus = async (user: User, data: UpdateArchiveStatus) => {
	// Destructure
	const { id: currentUserId, role } = user;
	const { userId, archiveStatus, canManageFarmsStauts } = data;

	// Applicator updating Grower
	if (role === 'APPLICATOR') {
		await prisma.applicatorGrower.update({
			where: {
				applicatorId_growerId: {
					applicatorId: currentUserId,
					growerId: userId,
				},
			},
			data: {
				isArchivedByApplicator: archiveStatus, // Only updating the inviteStatus field
			},
		});
		return {
			message: 'Updated Successfully.',
		};
	}
	//grower update applicator
	if (role === 'GROWER') {
		await prisma.applicatorGrower.update({
			where: {
				applicatorId_growerId: {
					applicatorId: userId,
					growerId: currentUserId,
				},
			},
			data: {
				isArchivedByGrower: archiveStatus, // Only updating the isArchivedByGrower field
				canManageFarms: canManageFarmsStauts,
			},
		});

		return {
			message: 'Updated Successfully.',
		};
	}
};
const getApplicatorByEmail = async (
	growerId: number,
	email: string,
	options: PaginateOptions,
) => {
	// Set pagination parameters
	const limit =
		options.limit && parseInt(options.limit.toString(), 10) > 0
			? parseInt(options.limit.toString(), 10)
			: 10;
	const page =
		options.page && parseInt(options.page.toString(), 10) > 0
			? parseInt(options.page.toString(), 10)
			: 1;
	const skip = (page - 1) * limit;

	// Find all users matching the email pattern (debounced search)
	const users = await prisma.user.findMany({
		where: {
			email: {
				contains: email, // Case-insensitive partial match
				mode: 'insensitive',
			},
			role: 'APPLICATOR',
			NOT: {
				// Exclude users already connected by grower with ACCEPTED or PENDING statuses
				applicators: {
					some: {
						growerId,
						inviteStatus: { in: ['ACCEPTED', 'PENDING'] },
					},
				},
			},
		},
		select: {
			id: true,
			profileImage: true,
			thumbnailProfileImage: true,
			firstName: true,
			lastName: true,
			fullName: true,
			email: true,
		},
		take: limit,
		skip,
	});

	// Get total count of matching users
	const totalResults = await prisma.user.count({
		where: {
			email: {
				contains: email,
				mode: 'insensitive',
			},
			role: 'APPLICATOR',
			NOT: {
				applicators: {
					some: {
						growerId,
						inviteStatus: { in: ['ACCEPTED', 'PENDING'] },
					},
				},
			},
		},
	});

	const totalPages = Math.ceil(totalResults / limit);
	// Return the paginated result including users, current page, limit, total pages, and total results
	return {
		result: users,
		page,
		limit,
		totalPages,
		totalResults,
	};
};
// const getApplicatorByEmail = async (userEmail: string) => {
// 	const applicator = await prisma.user.findFirst({
// 		where: {
// 			email: {
// 				equals: userEmail,
// 				mode: 'insensitive',
// 			},
// 			role: 'APPLICATOR',
// 		},
// 		include: {
// 			state: {
// 				select: {
// 					id: true,
// 					name: true,
// 				},
// 			},

// 		},
// 		omit: {
// 			password: true, // Exclude sensitive data
// 			businessName: true,
// 			experience: true,
// 		},
// 	});
// 	if (!applicator) {
// 		throw new ApiError(
// 			httpStatus.CONFLICT,
// 			'applicator with this email not found.',
// 		);
// 	}

// 	// Add total acres to the grower object
// 	return {
// 		...applicator,
// 	};
// };
const sendInviteToApplicator = async (
	userEmail: string,
	user: User,
	data: {
		canManageFarms: boolean;
		farmPermission: {
			farmId: number;
			canView: boolean;
			canEdit: boolean;
		}[];
	},
) => {
	if (user.role !== 'GROWER')
		return 'You are not allowed to perform this action.';
	const applicatorExist = await prisma.user.findFirst({
		where: {
			email: {
				equals: userEmail,
				mode: 'insensitive',
			},
			role: 'APPLICATOR',
		},
	});
	if (!applicatorExist) {
		throw new ApiError(
			httpStatus.CONFLICT,
			'applicator with this email not found.',
		);
	}
	const token = generateInviteToken('GROWER');

	await prisma.applicatorGrower.create({
		data: {
			applicatorId: applicatorExist.id,
			growerId: user.id,
			applicatorFirstName: applicatorExist.firstName,
			applicatorLastName: applicatorExist.lastName,
			inviteStatus: 'PENDING', // Only updating the inviteStatus field
			inviteInitiator: 'GROWER',
			canManageFarms: data.canManageFarms,
		},
	});
	// save farm permission as well
	await prisma.$transaction(
		data.farmPermission.map((farm) =>
			prisma.farmPermission.create({
				data: {
					farmId: farm.farmId,
					applicatorId: applicatorExist.id, // Use the existing applicator ID
					canView: farm.canView,
					canEdit: farm.canEdit,
				},
			}),
		),
	);
	const inviteLink = `https://applicator-ac.netlify.app/#/invitationView?token=${token}`;
	const subject = 'Invitation Email';
	const message = `
  You are invited to join our platform!<br><br>
  Click the link below to join.<br><br>
  ${inviteLink}<br><br>
  If you did not expect this invitation, please ignore this email.
`;
	if (applicatorExist) {
		const email = userEmail;

		// const email = user?.applicator?.email;

		if (!email) {
			throw new Error('Email address is not available for the grower.');
		}

		const html = await mailHtmlTemplate(subject, message);

		await sendEmail({
			emailTo: userEmail,
			subject,
			text: 'Request Invitation',
			html,
		});
		return {
			message: 'Invite sent successfully.',
		};
	}
};
const sendInviteToGrower = async (currentUser: User, growerId: number) => {
	const { id: applicatorId, role } = currentUser;
	const token = generateInviteToken('GROWER');

	if (role !== 'APPLICATOR')
		return 'You are not allowed to perform this action.';
	const user = await prisma.applicatorGrower.update({
		where: {
			applicatorId_growerId: {
				applicatorId,
				growerId,
			},
			inviteStatus: {
				in: ['NOT_SENT', 'REJECTED'],
			},
		},
		data: {
			inviteStatus: 'PENDING', // Only updating the inviteStatus field
			inviteInitiator: 'APPLICATOR', // to update inviteInitiator
			inviteToken: token,
		},
		include: {
			// Move include here
			grower: {
				select: {
					email: true,
				},
			},
		},
	});

	const inviteLink = `https://grower-ac.netlify.app/#/invitationView?token=${token}`;
	const subject = 'Invitation Email';
	const message = `
  You are invited to join our platform!<br><br>
  Click the link below to join.<br><br>
  ${inviteLink}<br><br>
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
			canManageFarms: true,
			grower: {
				include: {
					state: {
						select: {
							id: true,
							name: true,
						},
					},
					farms: {
						where: {
							permissions: {
								some: {
									applicatorId,
								},
							},
						},
						include: {
							permissions: {
								where: {
									applicatorId,
								},
							}, // Include permissions to calculate farm permissions for the applicator
							fields: true, // Include fields to calculate total acres
							state: {
								select: {
									id: true,
									name: true,
								},
							},
						},
						orderBy: {
							id: 'desc',
						},
					},
				},
				omit: {
					password: true, // Exclude sensitive data
					businessName: true,
					experience: true,
					stateId: true,
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
const getPendingInvitesFromOthers = async (
	user: User,
	options: PaginateOptions,
) => {
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
	// Determine the invite type based on the user's role
	const isApplicator = user.role === 'APPLICATOR';
	const type = isApplicator ? 'GROWER' : 'APPLICATOR';
	//if pending invites from grower get by applicator
	if (type === 'GROWER') {
		const pendingInvites = await prisma.applicatorGrower.findMany({
			where: {
				// OR: [{ applicatorId: userId }, { growerId: userId }],
				applicatorId: user.id,
				inviteStatus: 'PENDING',
				inviteInitiator: 'APPLICATOR', // user who sent invite to join platform
			},
			select: {
				growerFirstName: true,
				growerLastName: true,
				inviteStatus: true,
				isArchivedByApplicator: true,
				grower: {
					include: {
						state: {
							select: {
								id: true,
								name: true,
							},
						},
						farms: {
							where: {
								permissions: {
									some: {
										applicatorId: user.id,
									},
								},
							},
							include: {
								permissions: true,
								fields: true,
								state: {
									select: {
										id: true,
										name: true,
									},
								},
							},
						},
					},
					omit: {
						password: true,
						businessName: true,
						experience: true,
						stateId: true,
					},
				},
			},
			skip,
			take: limit,
			orderBy: {
				id: 'desc',
			},
		});
		// Calculate total acres for each grower
		const enrichedGrowers = pendingInvites.map((grower) => {
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
		const totalResults = await prisma.applicatorGrower.count({
			where: {
				applicatorId: user.id,
				inviteStatus: 'PENDING',
				inviteInitiator: 'APPLICATOR', // user who sent invite to join platform
			},
		});
		const totalPages = Math.ceil(totalResults / limit);
		return {
			result: enrichedGrowers,
			page,
			limit,
			totalPages,
			totalResults,
		};
	}
	//if pending invites from applicator get by grower
	if (type === 'APPLICATOR') {
		const pendingInvites = await prisma.applicatorGrower.findMany({
			where: {
				// OR: [{ applicatorId: userId }, { growerId: userId }],
				growerId: user.id,
				inviteStatus: 'PENDING',
				inviteInitiator: 'GROWER', // user who sent invite to join platform
			},
			select: {
				applicatorFirstName: true,
				applicatorLastName: true,
				inviteStatus: true,
				isArchivedByGrower: true,
				applicator: {
					include: {
						state: {
							select: {
								id: true,
								name: true,
							},
						},
						farms: {
							include: {
								permissions: true,
								fields: true,
								state: {
									select: {
										id: true,
										name: true,
									},
								},
							},
						},
					},
					omit: {
						password: true,
						businessName: true,
						experience: true,
						stateId: true,
					},
				},
			},
			skip,
			take: limit,
			orderBy: {
				id: 'desc',
			},
		});

		// Calculate total acres for each grower
		const enrichedApplicators = pendingInvites.map((applicator) => {
			const totalAcresByGrower = applicator.applicator?.farms.reduce(
				(totalApplicatorAcres, farm) => {
					const totalAcresByFarm = farm.fields.reduce(
						(totalFarmAcres, field) => {
							return (
								totalFarmAcres +
								parseFloat(field.acres?.toString() || '0')
							);
						},
						0,
					);
					return totalApplicatorAcres + totalAcresByFarm;
				},
				0,
			);

			// Return the grower object without farms
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const { farms, ...growerWithoutFarms } =
				applicator.applicator || {};

			return {
				...applicator,
				grower: {
					...growerWithoutFarms,
				},
				totalAcres: totalAcresByGrower,
			};
		});

		const totalResults = await prisma.applicatorGrower.count({
			where: {
				growerId: user.id,
				inviteStatus: 'PENDING',
				inviteInitiator: 'GROWER', // user who sent invite to join platform
			},
		});
		const totalPages = Math.ceil(totalResults / limit);
		return {
			result: enrichedApplicators,
			page,
			limit,
			totalPages,
			totalResults,
		};
	}
};
const verifyInviteToken = async (token: string) => {
	// Verify token and extract role
	const role = verifyInvite(token);
	if (!role) {
		throw new ApiError(
			httpStatus.UNAUTHORIZED,
			'Invalid or expired token.',
		);
	}

	let user = null;

	// Fetch user based on role
	if (role === 'GROWER') {
		const invite = await prisma.applicatorGrower.findUnique({
			where: {
				inviteToken: token,
				grower: {
					profileStatus: 'INCOMPLETE',
				},
			},
			select: {
				applicator: {
					select: {
						profileImage: true,
						thumbnailProfileImage: true,
						firstName: true,
						lastName: true,
						fullName: true,
						email: true,
					},
				},
				grower: {
					include: {
						state: {
							select: {
								name: true,
							},
						},
					},
					omit: {
						password: true,
						businessName: true,
						experience: true,
						createdAt: true,
						updatedAt: true,
					},
				},
			},
		});
		user = invite?.grower;
	} else if (role === 'APPLICATOR') {
		const invite = await prisma.applicatorGrower.findUnique({
			where: {
				inviteToken: token,
				applicator: {
					profileStatus: 'INCOMPLETE',
				},
			},
			select: {
				grower: {
					select: {
						profileImage: true,
						thumbnailProfileImage: true,
						firstName: true,
						lastName: true,
						fullName: true,
						email: true,
					},
				},
				applicator: {
					omit: {
						updatedAt: true,
						createdAt: true,
						password: true,
					},
					include: {
						state: {
							select: {
								name: true,
							},
						},
					},
				},
			},
		});
		user = invite?.applicator;
	} else if (role === 'WORKER') {
		const invite = await prisma.applicatorWorker.findUnique({
			where: {
				inviteToken: token,
				worker: {
					profileStatus: 'INCOMPLETE',
				},
			},
			select: {
				applicator: {
					select: {
						profileImage: true,
						thumbnailProfileImage: true,
						firstName: true,
						lastName: true,
						fullName: true,
						email: true,
					},
				},
				worker: {
					omit: {
						password: true,
						businessName: true,
						experience: true,
						createdAt: true,
						updatedAt: true,
					},
					include: {
						state: {
							select: {
								name: true,
							},
						},
					},
				},
			},
		});
		user = invite?.worker;
	} else {
		throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid role in token.');
	}

	// If no user is found, throw an error
	if (!user) {
		throw new ApiError(
			httpStatus.NOT_FOUND,
			'User not found or invite expired.',
		);
	}
	const { state } = user;
	// Return only the role-specific user data
	return { ...user, state: state?.name };
};
const getWeather = async (user: User, options: city) => {
	const OPEN_WEATHER_API_KEY = '4345ab71b47f32abf12039792c92f0c4';
	const userData = await prisma.user.findUnique({
		where: { id: user.id },
		select: { township: true },
	});

	// Get latitude & longitude from OpenWeather Geocoding API
	const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${options.city ? options.city : userData?.township}&limit=1&appid=${OPEN_WEATHER_API_KEY}`;
	const geoResponse = await axios.get(geoUrl);
	const { lat, lon } = geoResponse.data[0]; // Extract latitude & longitude

	// Fetch 5-day weather forecast because 7 day weather forcast with per hour is paid(one call api )
	const weatherUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${options.city ? options.city : userData?.township}&units=metric&appid=${OPEN_WEATHER_API_KEY}`;
	const weatherResponse = await axios.get(weatherUrl);
	const weatherData = weatherResponse.data.list;
	// Fetch Air Quality Index data
	const aqiUrl = `https://api.openweathermap.org/data/2.5/air_pollution/forecast?lat=${lat}&lon=${lon}&appid=${OPEN_WEATHER_API_KEY}`;
	const aqiResponse = await axios.get(aqiUrl);
	const aqiData = aqiResponse.data.list;

	// Group weather data by date
	const groupedWeather: Record<string, any> = {};

	weatherData.forEach((item: any) => {
		const date = item.dt_txt.split(' ')[0]; // Extract date (YYYY-MM-DD)
		const time24 = item.dt_txt.split(' ')[1].slice(0, 5); // Extract time (HH:mm)

		// Convert time to 12-hour format
		const [hour, minute] = time24.split(':');
		const hour12 = parseInt(hour) % 12 || 12;
		const ampm = parseInt(hour) >= 12 ? 'PM' : 'AM';
		const time12 = `${hour12}:${minute} ${ampm}`;

		if (!groupedWeather[date]) {
			groupedWeather[date] = {
				day: new Date(item.dt_txt).toLocaleDateString('en-US', {
					weekday: 'long',
				}),
				date: item.dt_txt,
				minTemp: item.main.temp, // Initialize minTemp with first value
				maxTemp: item.main.temp, // Initialize maxTemp with first value
				description: item.weather[0].description,
				hourly: [],
				aqi: null, // AQI will be added later
				city: options.city || userData?.township,
			};
		}
		// Update min and max temperature for the day it is basically the range of temperator according to designe
		groupedWeather[date].minTemp = Math.min(
			groupedWeather[date].minTemp,
			item.main.temp,
		);
		groupedWeather[date].maxTemp = Math.max(
			groupedWeather[date].maxTemp,
			item.main.temp,
		);
		// Add hourly weather data
		if (parseInt(hour) % 1 === 0) {
			// Ye condition ensure karegi ke har 1-hour ka data add ho
			groupedWeather[date].hourly.push({
				time: time12,
				temperature: item.main.temp,
				description: item.weather[0].description,
			});
		}
	});

	// Match AQI data with respective dates
	aqiData.forEach((aqiItem: any) => {
		const aqiDate = new Date(aqiItem.dt * 1000).toISOString().split('T')[0];
		if (groupedWeather[aqiDate]) {
			groupedWeather[aqiDate].aqi = aqiItem.main.aqi * 10; // Scale AQI
		}
	});

	// Convert object to array
	const formattedWeather = Object.values(groupedWeather);

	return { weather: formattedWeather };
};

const acceptOrRejectInviteThroughEmail = async (
	token: string,
	inviteStatus: InviteStatus,
) => {
	await prisma.applicatorGrower.update({
		where: {
			inviteToken: token,
			inviteStatus: 'PENDING',
			grower: {
				profileStatus: 'INCOMPLETE',
			},
		},
		data: {
			inviteStatus,
		},
	});
	return {
		message: 'Invite status updated successfully.',
	};
};
const resendInviteToApplicator = async (userEmail: string, user: User) => {
    if (user.role !== 'GROWER') {
        return 'You are not allowed to perform this action.';
    }

    const applicatorExist = await prisma.user.findFirst({
        where: {
            email: {
                equals: userEmail,
                mode: 'insensitive',
            },
            role: 'APPLICATOR',
        },
    });

    if (!applicatorExist) {
        throw new Error(
            'Applicator with this email not found.'
        );
    }

    const existingInvite = await prisma.applicatorGrower.findFirst({
        where: {
            applicatorId: applicatorExist.id,
            growerId: user.id,
        },
    });

    if (!existingInvite) {
        throw new Error(
            'No previous invitation found. Please send a new invite.'
        );
    }

    const token = generateInviteToken('GROWER');

    await prisma.applicatorGrower.update({
        where: {
            id: existingInvite.id,
        },
        data: {
            inviteStatus: 'PENDING',
        },
    });

    const inviteLink = `https://grower-ac.netlify.app/#/signup?token=${token}`;
    const subject = 'Resend Invitation Email';
    const message = `
        You are invited to join our platform!<br><br>
        Click the link below to join.<br><br>
        <a href="${inviteLink}">${inviteLink}</a><br><br>
        If you did not expect this invitation, please ignore this email.
    `;

    const html = await mailHtmlTemplate(subject, message);

    await sendEmail({
        emailTo: userEmail,
        subject,
        text: 'Resend Invitation',
        html,
    });

    return {
        message: 'Invite resent successfully.',
    };
};
const resendInviteToGrower = async (currentUser: User, growerId: number) => {
    const { id: applicatorId, role } = currentUser;
    if (role !== 'APPLICATOR') {
        return 'You are not allowed to perform this action.';
    }

 
    const token = generateInviteToken('GROWER');

   const updatedInvite = await prisma.applicatorGrower.update({
        where: {
            applicatorId_growerId: {
                applicatorId,
                growerId,
            },
        },
        data: {
            inviteStatus: 'PENDING',
            inviteInitiator: 'APPLICATOR',
            inviteToken: token,
        },
        include: {
            grower: {
                select: {
                    email: true,
                },
            },
        },
    });

    const email = updatedInvite?.grower?.email;
    if (!email) {
        throw new Error('Email address is not available for the grower.');
    }

    const inviteLink = `https://grower-ac.netlify.app/#/signup?token=${token}`;
    const subject = 'Resend Invitation Email';
    const message = `
        You are invited to join our platform!<br><br>
        Click the link below to join.<br><br>
        <a href="${inviteLink}">${inviteLink}</a><br><br>
        If you did not expect this invitation, please ignore this email.
    `;

    const html = await mailHtmlTemplate(subject, message);

    await sendEmail({
        emailTo: email,
        subject,
        text: 'Resend Invitation',
        html,
    });

    return {
        message: 'Invite resent successfully.',
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
	getApplicatorByEmail,
	deleteApplicator,
	getPendingInvitesFromOthers,
	verifyInviteToken,
	getWeather,
	acceptOrRejectInviteThroughEmail,
	resendInviteToApplicator,
	resendInviteToGrower
};
