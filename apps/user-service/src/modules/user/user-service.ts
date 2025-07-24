/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import { Decimal } from '@prisma/client/runtime/library';
import { Prisma } from '@prisma/client';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { prisma } from '../../../../../shared/libs/prisma-client';
import ApiError from '../../../../../shared/utils/api-error';
import { generateColorMapFromPercent } from '../../../../../shared/utils/generate-color-map';
import {
	UpdateUser,
	UpdateStatus,
	UpdateArchiveStatus,
	ResponseData,
} from './user-types';
import { mailHtmlTemplate } from '../../../../../shared/helpers/node-mailer';
import { sendEmail } from '../../../../../shared/helpers/node-mailer';
import { hashPassword } from '../../helper/bcrypt';
import {
	PaginateOptions,
	User,
	City,
} from '../../../../../shared/types/global';
import { generateToken, verifyInvite } from '../../helper/invite-token';
import { InviteStatus } from '@prisma/client';
import { getUploader } from '../../../../../shared/helpers/uploaderFactory';
import config from '../../config/env-config';

const uploadProfileImage = async (
	userId: number,
	file: Express.Multer.File,
) => {
	const uploader = getUploader();
	const blobName = `users/${userId}/profile/${uuidv4()}_${file.originalname}`;
	const thumbnailBlobName = `users/${userId}/profile/thumbnail_${uuidv4()}_${file.originalname}`;

	// Get image metadata
	const metadata = await sharp(file.buffer).metadata();
	const originalWidth = metadata.width || 0;
	const originalHeight = metadata.height || 0;
	const thumbnailSize = Math.min(originalWidth, originalHeight);
	const left = Math.floor((originalWidth - thumbnailSize) / 2);
	const top = Math.floor((originalHeight - thumbnailSize) / 2);

	// Process original and thumbnail images
	const [compressedImageBuffer, thumbnailBuffer] = await Promise.all([
		sharp(file.buffer)
			.extract({ left, top, width: thumbnailSize, height: thumbnailSize })
			.resize(thumbnailSize, thumbnailSize)
			.toBuffer(),

		sharp(file.buffer)
			.extract({ left, top, width: thumbnailSize, height: thumbnailSize })
			.resize(50, 50)
			.toBuffer(),
	]);

	const uploadObjects = [
		{
			Key: blobName,
			Body: compressedImageBuffer,
			ContentType: file.mimetype,
		},
		{
			Key: thumbnailBlobName,
			Body: thumbnailBuffer,
			ContentType: file.mimetype,
		},
	];

	// Upload both images using the helper
	const res = await uploader(uploadObjects);

	return {
		profileImage: res[0],
		thumbnailProfileImage: res[1],
	};
};

// to update user profile
const updateProfile = async (data: UpdateUser, userId: number) => {
	let { password } = data;
	const { firstName, lastName } = data;
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: {
			firstName: true,
			lastName: true,
			email: true,
			profileStatus: true,
		},
	});
	// hash the password only if it is provided
	if (password) {
		const hashedPassword = await hashPassword(data.password);
		password = hashedPassword;
	}
	// Construct fullName if firstName or lastName is updated
	let fullName: string | undefined;
	if (firstName || lastName) {
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
	const { state } = udpatedUser; // Exclude password
	if (user?.profileStatus === 'INCOMPLETE') {
		const subject = 'Welcome to Acre Connect!';

		const message = `<p>Hi ${firstName} ${lastName},</p><br><br>
			<p>Welcome to Acre Connect! We’re excited to have you onboard.</p><br><br>
				   <p>If you have any questions, feel free to reach out.</p><br><br>
				   <p>Best Regards,<br>Acre Connect Team</p><br><br>
			  If you did not expect this, please ignore this email.
			`;

		const html = await mailHtmlTemplate(subject, message);

		await sendEmail({
			emailTo: user.email ?? '', // Defaults to an empty string if email is null/undefined
			subject,
			text: 'Welcome to Acre Connect!',
			html,
		});
	}
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
			httpStatus.NOT_FOUND,
			'Grower with this email not found.',
		);
	}
	if (grower?.role !== 'GROWER') {
		throw new ApiError(
			httpStatus.FORBIDDEN,
			'User exists but is not a grower.',
		);
	}

	const applicatorGrower = await prisma.applicatorGrower.findUnique({
		where: {
			applicatorId_growerId: {
				applicatorId,
				growerId: grower.id,
			},
		},
	});

	// Fetch total acres separately for all farms
	const farmIds = grower.farms.map((farm) => farm.id);
	const farmAcres = await prisma.field.groupBy({
		by: ['farmId'],
		where: {
			farmId: { in: farmIds },
		},
		_sum: {
			acres: true,
		},
	});

	// Convert Decimal to number safely
	const farmAcresMap = farmAcres.reduce(
		(acc, { farmId, _sum }) => {
			acc[farmId] = _sum.acres ? _sum.acres.toNumber() : 0; // Convert Decimal to number
			return acc;
		},
		{} as Record<number, number>,
	);

	const farmsWithTotalAcres = grower.farms.map((farm) => ({
		...farm,
		totalAcres: farmAcresMap[farm.id] ?? 0, // Ensure it's a number
	}));

	// Calculate total acres for the grower
	const totalAcresByGrower = farmsWithTotalAcres.reduce(
		(total, farm) => total + farm.totalAcres,
		0,
	);

	// Return modified grower object
	return {
		inviteStatus: applicatorGrower ? applicatorGrower.inviteStatus : null,
		...grower,
		farms: farmsWithTotalAcres, // Farms without fields but with totalAcres
		totalAcres: totalAcresByGrower,
		inviteUrl:
			applicatorGrower?.inviteStatus === 'PENDING'
				? `https://grower-ac.netlify.app/#/invitationView?token=${applicatorGrower.inviteToken}`
				: undefined,
		isInviteExpired:
			applicatorGrower?.inviteStatus === 'PENDING'
				? applicatorGrower?.expiresAt
					? new Date(applicatorGrower?.expiresAt) <= new Date()
					: true
				: undefined,
	};
};

// create grower
const createGrower = async (data: UpdateUser, userId: number) => {
	const { firstName, lastName } = data;
	// Generate Token
	const token = generateToken('GROWER');
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
				// inviteStatus: 'PENDING',
				inviteStatus: 'ACCEPTED',
				inviteInitiator: 'APPLICATOR',
				inviteToken: token,
				expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
			},
		});

		return [grower];
	});
	const inviteLink = `https://grower-ac.netlify.app/#/invitationView?token=${token}`;
	const subject = 'Invitation Email';
	const message = `
  You are invited to join our platform!<br><br>
  Click the link below to join.<br><br>
  <a href="${inviteLink}">${inviteLink}</a><br><br>
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
	options: PaginateOptions & {
		label?: string;
		searchValue?: string;
	},
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
	const filters: Prisma.ApplicatorGrowerWhereInput = {
		applicatorId,
		AND: [
			{
				OR: [
					{
						inviteInitiator: 'APPLICATOR',
						inviteStatus: 'PENDING',
					},
					{
						inviteStatus: {
							in: ['ACCEPTED', 'REJECTED', 'DELETED_BY_GROWER'],
						},
					},
				],
			},
		],
	};
	if (options.label && options.searchValue) {
		const searchFilter: Prisma.ApplicatorGrowerWhereInput = {};
		const searchValue = options.searchValue;
		if (options.label === 'all') {
			const upperValue = searchValue.toUpperCase();
			const isStatusMatch = Object.values(InviteStatus).includes(
				upperValue as InviteStatus,
			);

			if (isStatusMatch) {
				filters.inviteStatus = {
					equals: upperValue as InviteStatus,
				};
			} else {
				Object.assign(filters, {
					OR: [
						{
							grower: {
								OR: [
									{
										id: !isNaN(Number(searchValue))
											? parseInt(searchValue, 10)
											: undefined,
									},
									{
										fullName: {
											contains: searchValue,
											mode: 'insensitive',
										},
									},
									{
										firstName: {
											contains: searchValue,
											mode: 'insensitive',
										},
									},
									{
										lastName: {
											contains: searchValue,
											mode: 'insensitive',
										},
									},
									{
										email: {
											equals: searchValue,
											mode: 'insensitive',
										},
									},
									{
										phoneNumber: {
											contains: searchValue,
											mode: 'insensitive',
										},
									},
									{
										address1: {
											contains: searchValue,
											mode: 'insensitive',
										},
									},
								],
							},
						},
					],
				});
			}
		} else {
			switch (options.label) {
				case 'inviteStatus':
					searchFilter.inviteStatus = {
						equals: searchValue.toUpperCase() as InviteStatus,
					};
					break;
				case 'growerName':
					searchFilter.grower = {
						OR: [
							{
								fullName: {
									contains: searchValue,
									mode: 'insensitive',
								},
							},
							{
								firstName: {
									contains: searchValue,
									mode: 'insensitive',
								},
							},
							{
								lastName: {
									contains: searchValue,
									mode: 'insensitive',
								},
							},
						],
					};
					break;
				case 'growerId':
					searchFilter.growerId = parseInt(searchValue, 10);

					break;
				case 'email':
					searchFilter.grower = {
						email: { equals: searchValue, mode: 'insensitive' },
					};
					break;
				case 'phoneNumber':
					searchFilter.grower = {
						phoneNumber: {
							contains: searchValue,
							mode: 'insensitive',
						},
					};
					break;
				case 'address1':
					searchFilter.grower = {
						address1: {
							contains: searchValue,
							mode: 'insensitive',
						},
					};
					break;
				default:
					throw new Error('Invalid label provided.');
			}
			Object.assign(filters, searchFilter); // Merge filters dynamically
		}
	}
	// Fetch growers with their farms and fields
	const growers = await prisma.applicatorGrower.findMany({
		where: filters,
		select: {
			growerFirstName: true,
			growerLastName: true,
			inviteStatus: true,
			isArchivedByApplicator: true,
			autoAcceptJobsByApplicator: true,
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
							createdById: applicatorId,
							// permissions: {
							// 	some: {
							// 		applicatorId,
							// 	},
							// },
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
						return totalFarmAcres.plus(
							new Decimal(field.acres || 0),
						);
					},
					new Decimal(0),
				);
				return totalGrowerAcres.plus(totalAcresByFarm); // keep as decimal
			},
			new Decimal(0),
		);

		// Return the grower object without farms
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { farms, ...growerWithoutFarms } = grower.grower || {};

		return {
			...grower,
			grower: {
				...growerWithoutFarms,
				firstName: grower.growerFirstName,
				lastName: grower.growerLastName,
				fullName: `${grower.growerFirstName} ${grower.growerLastName}`,
			},
			totalAcres: totalAcresByGrower.toDecimalPlaces(2).toNumber(),
		};
	});
	const totalResults = await prisma.applicatorGrower.count({
		where: filters,
		// {
		// 	applicatorId,
		// 	AND: [
		// 		{
		// 			OR: [
		// 				{
		// 					inviteInitiator: 'APPLICATOR',
		// 					inviteStatus: 'PENDING',
		// 				}, // PENDING must be from APPLICATOR
		// 				{ inviteStatus: { in: ['ACCEPTED', 'REJECTED'] } }, // Any ACCEPTED or REJECTED
		// 			],
		// 		},
		// 	],
		// },
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
	options: PaginateOptions & {
		label?: string;
		searchValue?: string;
	},
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
	const filters: Prisma.ApplicatorGrowerWhereInput = {
		growerId,
		AND: [
			{
				OR: [
					{
						inviteInitiator: 'GROWER',
						inviteStatus: 'PENDING',
					},
					{
						inviteStatus: {
							in: [
								'ACCEPTED',
								'REJECTED',
								'DELETED_BY_APPLICATOR',
							],
						},
					},
				],
			},
		],
	};
	if (options.label && options.searchValue) {
		const searchFilter: Prisma.ApplicatorGrowerWhereInput = {};
		const searchValue = options.searchValue;
		if (options.label === 'all') {
			const upperValue = searchValue.toUpperCase();
			const isStatusMatch = Object.values(InviteStatus).includes(
				upperValue as InviteStatus,
			);

			if (isStatusMatch) {
				filters.inviteStatus = {
					equals: upperValue as InviteStatus,
				};
			} else {
				Object.assign(filters, {
					OR: [
						{
							applicator: {
								OR: [
									{
										id: !isNaN(Number(searchValue))
											? parseInt(searchValue, 10)
											: undefined,
									},
									{
										fullName: {
											contains: searchValue,
											mode: 'insensitive',
										},
									},
									{
										firstName: {
											contains: searchValue,
											mode: 'insensitive',
										},
									},
									{
										lastName: {
											contains: searchValue,
											mode: 'insensitive',
										},
									},
									{
										email: {
											equals: searchValue,
											mode: 'insensitive',
										},
									},
									{
										phoneNumber: {
											contains: searchValue,
											mode: 'insensitive',
										},
									},
									{
										address1: {
											contains: searchValue,
											mode: 'insensitive',
										},
									},
								],
							},
						},
					],
				});
			}
		} else {
			switch (options.label) {
				case 'inviteStatus':
					searchFilter.inviteStatus = {
						equals: searchValue.toUpperCase() as InviteStatus,
					};
					break;
				case 'applicatorName':
					searchFilter.applicator = {
						OR: [
							{
								fullName: {
									contains: searchValue,
									mode: 'insensitive',
								},
							},
							{
								firstName: {
									contains: searchValue,
									mode: 'insensitive',
								},
							},
							{
								lastName: {
									contains: searchValue,
									mode: 'insensitive',
								},
							},
						],
					};
					break;
				case 'applicatorId':
					searchFilter.applicatorId = parseInt(searchValue, 10);

					break;
				case 'email':
					searchFilter.applicator = {
						email: { equals: searchValue, mode: 'insensitive' },
					};
					break;
				case 'phoneNumber':
					searchFilter.applicator = {
						phoneNumber: {
							contains: searchValue,
							mode: 'insensitive',
						},
					};
					break;
				case 'address1':
					searchFilter.applicator = {
						address1: {
							contains: searchValue,
							mode: 'insensitive',
						},
					};
					break;
				default:
					throw new Error('Invalid label provided.');
			}

			Object.assign(filters, searchFilter); // Merge filters dynamically
		}
	}
	// Fetch applicators
	const applicators = await prisma.applicatorGrower.findMany({
		where: filters,
		select: {
			applicatorFirstName: true,
			applicatorLastName: true,
			inviteStatus: true,
			isArchivedByGrower: true,
			canManageFarms: true,
			inviteToken: true,
			email: true,
			expiresAt: true,
			inviteInitiator: true,
			autoAcceptJobsByGrower: true,
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
	// ✅ Ensure `applicator` is never null by adding `email`
	const updatedApplicators = applicators.map((applicator) => {
		return {
			...applicator,
			applicator: applicator.applicator ?? { email: applicator.email }, // Ensure `applicator` is not null
			inviteUrl:
				applicator.inviteStatus === 'PENDING'
					? `https://applicator-ac.netlify.app/invitationView?token=${applicator.inviteToken}`
					: undefined,
			isInviteExpired:
				applicator.inviteStatus === 'PENDING'
					? applicator.expiresAt
						? new Date(applicator.expiresAt) <= new Date()
						: true
					: undefined,
		};
	});
	const totalResults = await prisma.applicatorGrower.count({
		where: filters,
	});
	const totalPages = Math.ceil(updatedApplicators?.length / limit);
	// Return the paginated result including users, current page, limit, total pages, and total results
	return {
		result: updatedApplicators,
		page,
		limit,
		totalPages,
		totalResults,
	};
};
const updateInviteStatus = async (user: User, data: UpdateStatus) => {
	// Destructure input values
	const { id: userId, role } = user;
	const { status, userId: targetUserId } = data;

	// Determine IDs based on the role
	const isGrower = role === 'GROWER';
	const isWorker = role === 'WORKER';
	const isApplicator = role === 'APPLICATOR';
	const applicatorId = isGrower || isWorker ? targetUserId : userId;
	const growerId = isGrower ? userId : targetUserId;

	// Handle Worker Invitations
	if (isWorker) {
		await prisma.$transaction(async (prisma) => {
			const invite = await prisma.applicatorWorker.update({
				where: {
					applicatorId_workerId: { applicatorId, workerId: userId },
					inviteStatus: 'PENDING',
				},
				data: { inviteStatus: status },
			});
			await prisma.notification.create({
				data: {
					userId: targetUserId, // Notify the appropriate user
					inviteId: invite.id,
					type:
						status === 'ACCEPTED'
							? 'ACCEPT_INVITE'
							: 'REJECT_INVITE',
				},
			});
		});
		return {
			message: `Worker invite ${status.toLowerCase()} successfully.`,
		};
	}
	// Handle Applicator & Grower Invitations
	if (isApplicator || isGrower) {
		if (status === 'ACCEPTED') {
			// Update the inviteStatus and (for growers) `canManageFarms`
			await prisma.$transaction(async (prisma) => {
				const invite = await prisma.applicatorGrower.update({
					where: {
						applicatorId_growerId: { applicatorId, growerId },
						inviteStatus: 'PENDING',
					},
					data: {
						inviteStatus: status,
						...(isGrower ? { canManageFarms: true } : {}), // Growers get farm management permission
					},
					select: {
						id: true,
						applicator: {
							select: {
								id: true,
								state: { select: { name: true } },
							},
						},
						pendingFarmPermission: true,
					},
				});

				// Ensure `applicator` exists
				if (!invite.applicator?.id) {
					throw new Error('Applicator ID is missing');
				}

				// Transfer pending farm permissions if they exist
				if (
					Array.isArray(invite.pendingFarmPermission) &&
					invite.pendingFarmPermission.length > 0
				) {
					await prisma.farmPermission.createMany({
						data: invite.pendingFarmPermission.map((perm) => ({
							farmId: perm.farmId,
							applicatorId: invite?.applicator?.id ?? 0,
							canView: perm.canView,
							canEdit: perm.canEdit,
						})),
					});

					// Remove pending permissions after transfer
					await prisma.pendingFarmPermission.deleteMany({
						where: { inviteId: invite.id },
					});
				}
				await prisma.notification.create({
					data: {
						userId: targetUserId, // Notify the appropriate user
						inviteId: invite.id,
						type: 'ACCEPT_INVITE',
					},
				});
			});
			return { message: 'Invite accepted successfully.' };
		}
		if (status === 'REJECTED') {
			await prisma.$transaction(async (prisma) => {
				const invite = await prisma.applicatorGrower.update({
					where: {
						applicatorId_growerId: { applicatorId, growerId },
						inviteStatus: 'PENDING',
					},
					data: { inviteStatus: 'REJECTED' },
				});
				await prisma.notification.create({
					data: {
						userId: targetUserId, // Notify the appropriate user
						inviteId: invite.id,
						type: 'REJECT_INVITE',
					},
				});
			});
			return { message: 'Invite rejected successfully.' };
		}
	}
};

const deleteGrower = async (growerId: number, applicatorId: number) => {
	await prisma.$transaction(async (tx) => {
		// Check if the applicatorGrower record exists and its soft delete status
		const existingRecord = await tx.applicatorGrower.findUnique({
			where: {
				applicatorId_growerId: { growerId, applicatorId },
			},
			select: {
				inviteStatus: true,
				id: true,
			},
		});

		if (
			existingRecord?.inviteStatus === 'DELETED_BY_GROWER' ||
			existingRecord?.inviteStatus === 'PENDING'
		) {
			// If already deleted by both, perform a hard delete
			await tx.applicatorGrower.delete({
				where: { id: existingRecord.id },
			});
		} else {
			await tx.applicatorGrower.update({
				where: {
					applicatorId_growerId: {
						growerId,
						applicatorId,
					},
				},
				data: {
					isDeletedByApplicator: true,
					applicatorDeletedTill: new Date(),
					inviteStatus: 'DELETED_BY_APPLICATOR',
				},
			});
		}

		const farms = await tx.farm.findMany({
			where: {
				growerId,
			},
			select: {
				id: true,
			},
		});
		const farmIds = farms.map((farm) => farm.id);
		await tx.pendingFarmPermission.deleteMany({
			where: { inviteId: existingRecord?.id },
		});
		if (farmIds.length > 0) {
			await tx.farmPermission.deleteMany({
				where: { applicatorId, farmId: { in: farmIds } },
			});
		}
	});

	return {
		message: "Grower deleted successfully from the applicator's view.",
	};
};

const deleteApplicator = async (growerId: number, applicatorId: number) => {
	await prisma.$transaction(async (tx) => {
		// Check if the applicatorGrower record exists and its soft delete status
		const existingRecord = await tx.applicatorGrower.findUnique({
			where: {
				applicatorId_growerId: { growerId, applicatorId },
			},
			select: {
				inviteStatus: true,
				id: true,
			},
		});

		if (
			existingRecord?.inviteStatus === 'DELETED_BY_APPLICATOR' ||
			existingRecord?.inviteStatus === 'PENDING'
		) {
			// If already deleted by both, perform a hard delete
			await tx.applicatorGrower.delete({
				where: { id: existingRecord.id },
			});
		} else {
			await tx.applicatorGrower.update({
				where: {
					applicatorId_growerId: {
						growerId,
						applicatorId,
					},
				},
				data: {
					isDeletedByGrower: true,
					growerDeletedTill: new Date(),
					inviteStatus: 'DELETED_BY_GROWER', // Update status to reflect the deletion
				},
			});
		}

		const farms = await tx.farm.findMany({
			where: {
				growerId,
			},
			select: {
				id: true,
			},
		});
		const farmIds = farms.map((farm) => farm.id);
		await tx.pendingFarmPermission.deleteMany({
			where: { inviteId: existingRecord?.id },
		});
		if (farmIds.length > 0) {
			await tx.farmPermission.deleteMany({
				where: { applicatorId, farmId: { in: farmIds } },
			});
		}
	});

	return {
		message: "Applicator deleted successfully from the grower's view.",
	};
};

const getPendingInvites = async (
	user: User,
	options: PaginateOptions & {
		label?: string;
		searchValue?: string;
	},
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
	// filteration according to lable and serachvalue
	const filters: Prisma.ApplicatorGrowerWhereInput = {
		inviteStatus: 'PENDING',
		inviteInitiator: user.role === 'APPLICATOR' ? 'GROWER' : 'APPLICATOR',
	};
	if (user.role === 'APPLICATOR') {
		filters.applicatorId = user.id;
	} else if (user.role === 'GROWER') {
		filters.growerId = user.id;
	}

	if (user.role === 'APPLICATOR') {
		if (options.label && options.searchValue) {
			const searchFilter: Prisma.ApplicatorGrowerWhereInput = {};
			const searchValue = options.searchValue;
			if (options.label === 'all') {
				Object.assign(filters, {
					OR: [
						{
							grower: {
								OR: [
									{
										id: !isNaN(Number(searchValue))
											? parseInt(searchValue, 10)
											: undefined,
									},
									{
										fullName: {
											contains: searchValue,
											mode: 'insensitive',
										},
									},
									{
										firstName: {
											contains: searchValue,
											mode: 'insensitive',
										},
									},
									{
										lastName: {
											contains: searchValue,
											mode: 'insensitive',
										},
									},
									{
										email: {
											equals: searchValue,
											mode: 'insensitive',
										},
									},
									{
										phoneNumber: {
											contains: searchValue,
											mode: 'insensitive',
										},
									},
									{
										address1: {
											contains: searchValue,
											mode: 'insensitive',
										},
									},
								],
							},
						},
					],
				});
			} else {
				switch (options.label) {
					case 'growerId':
						searchFilter.growerId = parseInt(searchValue, 10);
						break;
					case 'growerName':
						searchFilter.grower = {
							OR: [
								{
									fullName: {
										contains: searchValue,
										mode: 'insensitive',
									},
								},
								{
									firstName: {
										contains: searchValue,
										mode: 'insensitive',
									},
								},
								{
									lastName: {
										contains: searchValue,
										mode: 'insensitive',
									},
								},
							],
						};
						break;

					case 'phoneNumber':
						searchFilter.grower = {
							phoneNumber: {
								contains: searchValue,
								mode: 'insensitive',
							},
						};
						break;
					case 'email':
						searchFilter.grower = {
							email: { equals: searchValue, mode: 'insensitive' },
						};
						break;
					case 'address1':
						searchFilter.grower = {
							address1: {
								contains: searchValue,
								mode: 'insensitive',
							},
						};
						break;
					default:
						throw new Error('Invalid label provided.');
				}
				Object.assign(filters, searchFilter); // Merge filters dynamically
			}
		}
		const pendingInvites = await prisma.applicatorGrower.findMany({
			where: filters,
			//  {
			// 	applicatorId: user.id,
			// 	inviteStatus: 'PENDING',
			// 	inviteInitiator: 'GROWER', // user who sent invite to join platform
			// },
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
							include: {
								pendingFarmPermission: true,
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
							return totalFarmAcres.plus(
								new Decimal(field.acres || 0),
							);
						},
						new Decimal(0),
					);
					return totalGrowerAcres.plus(totalAcresByFarm); // keep as decimal
				},
				new Decimal(0),
			);

			// Return the grower object without farms
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const { farms, ...growerWithoutFarms } = grower.grower || {};

			return {
				...grower,
				grower: {
					...growerWithoutFarms,
					firstName: grower.growerFirstName,
					lastName: grower.growerLastName,
					fullName: `${grower.growerFirstName} ${grower.growerLastName}`,
				},
				totalAcres: totalAcresByGrower?.toDecimalPlaces(2).toNumber(),
			};
		});
		const totalResults = await prisma.applicatorGrower.count({
			where: filters,
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
		if (options.label && options.searchValue) {
			const searchFilter: Prisma.ApplicatorGrowerWhereInput = {};
			const searchValue = options.searchValue;
			if (options.label === 'all') {
				Object.assign(filters, {
					OR: [
						{
							applicator: {
								OR: [
									{
										id: !isNaN(Number(searchValue))
											? parseInt(searchValue, 10)
											: undefined,
									},
									{
										fullName: {
											contains: searchValue,
											mode: 'insensitive',
										},
									},
									{
										firstName: {
											contains: searchValue,
											mode: 'insensitive',
										},
									},
									{
										lastName: {
											contains: searchValue,
											mode: 'insensitive',
										},
									},
									{
										email: {
											equals: searchValue,
											mode: 'insensitive',
										},
									},
									{
										phoneNumber: {
											contains: searchValue,
											mode: 'insensitive',
										},
									},
									{
										address1: {
											contains: searchValue,
											mode: 'insensitive',
										},
									},
								],
							},
						},
					],
				});
			} else {
				switch (options.label) {
					case 'applicatorId':
						searchFilter.applicatorId = parseInt(searchValue, 10);
						break;
					case 'applicatorName':
						searchFilter.applicator = {
							OR: [
								{
									fullName: {
										contains: searchValue,
										mode: 'insensitive',
									},
								},
								{
									firstName: {
										contains: searchValue,
										mode: 'insensitive',
									},
								},
								{
									lastName: {
										contains: searchValue,
										mode: 'insensitive',
									},
								},
							],
						};
						break;

					case 'phoneNumber':
						searchFilter.applicator = {
							phoneNumber: {
								contains: searchValue,
								mode: 'insensitive',
							},
						};
						break;
					case 'email':
						searchFilter.applicator = {
							email: { equals: searchValue, mode: 'insensitive' },
						};
						break;
					case 'address1':
						searchFilter.applicator = {
							address1: {
								contains: searchValue,
								mode: 'insensitive',
							},
						};
						break;
					default:
						throw new Error('Invalid label provided.');
				}
				Object.assign(filters, searchFilter); // Merge filters dynamically
			}
		}
		const pendingInvites = await prisma.applicatorGrower.findMany({
			where: filters,
			// {
			// 	growerId: user.id,
			// 	inviteStatus: 'PENDING',
			// 	inviteInitiator: 'APPLICATOR', // user who sent invite to join platform
			// },
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
								pendingFarmPermission: true,
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
				(totalGrowerAcres, farm) => {
					const totalAcresByFarm = farm.fields.reduce(
						(totalFarmAcres, field) => {
							return totalFarmAcres.plus(
								new Decimal(field.acres || 0),
							);
						},
						new Decimal(0),
					);
					return totalGrowerAcres.plus(totalAcresByFarm); // keep as decimal
				},
				new Decimal(0),
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
				totalAcres: totalAcresByGrower?.toDecimalPlaces(2).toNumber(),
			};
		});

		const totalResults = await prisma.applicatorGrower.count({
			where: filters,
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
// const getApplicatorByEmail = async (
// 	growerId: number,
// 	email: string,
// 	options: PaginateOptions,
// ) => {
// 	// Set pagination parameters
// 	const limit =
// 		options.limit && parseInt(options.limit.toString(), 10) > 0
// 			? parseInt(options.limit.toString(), 10)
// 			: 10;
// 	const page =
// 		options.page && parseInt(options.page.toString(), 10) > 0
// 			? parseInt(options.page.toString(), 10)
// 			: 1;
// 	const skip = (page - 1) * limit;

// 	// Find all users matching the email pattern (debounced search)
// 	const users = await prisma.user.findMany({
// 		where: {
// 			email: {
// 				contains: email, // Case-insensitive partial match
// 				mode: 'insensitive',
// 			},
// 			role: 'APPLICATOR',
// 			NOT: {
// 				// Exclude users already connected by grower with ACCEPTED or PENDING statuses
// 				applicators: {
// 					some: {
// 						growerId,
// 						inviteStatus: { in: ['ACCEPTED', 'PENDING'] },
// 					},
// 				},
// 			},
// 		},
// 		select: {
// 			id: true,
// 			profileImage: true,
// 			thumbnailProfileImage: true,
// 			firstName: true,
// 			lastName: true,
// 			fullName: true,
// 			email: true,
// 		},
// 		take: limit,
// 		skip,
// 	});

// 	// Get total count of matching users
// 	const totalResults = await prisma.user.count({
// 		where: {
// 			email: {
// 				contains: email,
// 				mode: 'insensitive',
// 			},
// 			role: 'APPLICATOR',
// 			NOT: {
// 				applicators: {
// 					some: {
// 						growerId,
// 						inviteStatus: { in: ['ACCEPTED', 'PENDING'] },
// 					},
// 				},
// 			},
// 		},
// 	});

// 	const totalPages = Math.ceil(totalResults / limit);
// 	// Return the paginated result including users, current page, limit, total pages, and total results
// 	return {
// 		result: users,
// 		page,
// 		limit,
// 		totalPages,
// 		totalResults,
// 	};
// };

const getApplicatorByEmail = async (growerId: number, email: string) => {
	// Find all users matching the email pattern (debounced search)
	const user = await prisma.user.findFirst({
		where: {
			email: {
				equals: email,
				mode: 'insensitive',
			},
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
			password: true, // Exclude sensitive data
		},
	});
	if (!user) {
		throw new ApiError(
			httpStatus.NOT_FOUND,
			'Applicator with this email not found.',
		);
	}

	if (user.role !== 'APPLICATOR' && user.role !== 'APPLICATOR_USER') {
		throw new ApiError(
			httpStatus.FORBIDDEN,
			'User exists but is not an applicator.',
		);
	}

	const existingInvite = await prisma.applicatorGrower.findUnique({
		where: {
			applicatorId_growerId: {
				growerId: growerId,
				applicatorId: user?.id,
			},
		},
	});

	const { state } = user;

	return {
		inviteStatus: existingInvite ? existingInvite.inviteStatus : null,
		...user,
		state: state?.name,
	};
};
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
	if (user.role !== 'GROWER') {
		throw new Error('You are not allowed to perform this action.');
	}

	const applicator = await prisma.user.findUnique({
		where: { email: userEmail },
	});
	if (!applicator) {
		// Send email invitation
		const inviteLink = `https://applicator-ac.netlify.app/signup`;
		const subject = 'Invitation Email';
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
			text: 'Request Invitation',
			html,
		});
		return { message: 'Invite sent successfully.' };
	}

	if (
		applicator?.role !== 'APPLICATOR' &&
		applicator?.role !== 'APPLICATOR_USER'
	) {
		throw new ApiError(
			httpStatus.FORBIDDEN,
			'User exists but is not an applicator.',
		);
	}
	const shouldAutoAccept = applicator?.autoAcceptInvite;
	const existingInvite = await prisma.applicatorGrower.findUnique({
		where: {
			applicatorId_growerId: {
				growerId: user.id,
				applicatorId: applicator?.id,
			},
		},
	});

	const inviteToken = generateToken('APPLICATOR');
	//  Fetch farms owned by the grower
	const growerFarms = await prisma.farm.findMany({
		where: { growerId: user.id },
		select: { id: true },
	});

	const growerFarmIds = new Set(growerFarms.map((farm) => farm.id));

	// Validate if the grower owns all the farms in `data.farmPermission`
	const unauthorizedFarms = data.farmPermission.filter(
		(farm) => !growerFarmIds.has(farm.farmId),
	);

	if (unauthorizedFarms.length > 0) {
		throw new Error(
			`You cannot assign permissions for farm(s): ${unauthorizedFarms.map((f) => f.farmId).join(', ')}`,
		);
	}

	// Define `invite` type explicitly
	let invite: { id: number };

	await prisma.$transaction(async (tx) => {
		if (existingInvite) {
			// if (existingInvite.inviteStatus === 'PENDING') {
			// 	// Preserve previous farm permissions and canManageFarms flag
			// 	invite = await tx.applicatorGrower.update({
			// 		where: { id: existingInvite.id },
			// 		data: {
			// 			inviteStatus: 'PENDING',
			// 			inviteToken,
			// 			expiresAt: new Date(
			// 				Date.now() + 3 * 24 * 60 * 60 * 1000,
			// 			),
			// 			inviteInitiator: 'GROWER',
			// 			// canManageFarms: existingInvite.canManageFarms, // Keep previous value
			// 		},
			// 		select: { id: true },
			// 	});

			// 	// Keep previous farm permissions
			// 	// const previousPermissions =
			// 	// 	await tx.pendingFarmPermission.findMany({
			// 	// 		where: { inviteId: existingInvite.id },
			// 	// 	});

			// 	// await tx.pendingFarmPermission.deleteMany({
			// 	// 	where: { inviteId: existingInvite.id },
			// 	// });

			// 	// await tx.pendingFarmPermission.createMany({
			// 	// 	data: previousPermissions.map((farm) => ({
			// 	// 		farmId: farm.farmId,
			// 	// 		inviteId: invite.id,
			// 	// 		canView: farm.canView,
			// 	// 		canEdit: farm.canEdit,
			// 	// 	})),
			// 	// });
			// } else
			if (
				existingInvite.inviteStatus === 'PENDING' ||
				existingInvite.inviteStatus === 'REJECTED' ||
				existingInvite.inviteStatus === 'DELETED_BY_GROWER' ||
				existingInvite.inviteStatus === 'DELETED_BY_APPLICATOR'
			) {
				// Overwrite with new farm permissions and canManageFarms flag
				invite = await tx.applicatorGrower.update({
					where: { id: existingInvite.id },
					data: {
						inviteStatus: shouldAutoAccept ? 'ACCEPTED' : 'PENDING',
						inviteToken,
						expiresAt: new Date(
							Date.now() + 3 * 24 * 60 * 60 * 1000,
						),
						inviteInitiator: 'GROWER',
						canManageFarms: data.canManageFarms, // Use new value
					},
					select: { id: true },
				});

				// Overwrite farm permissions
				await tx.pendingFarmPermission.deleteMany({
					where: { inviteId: existingInvite.id },
				});
				if (shouldAutoAccept) {
					await tx.farmPermission.createMany({
						data: data.farmPermission
							.filter((farm) => farm.canView) // filter where canView is true
							.map((farm) => ({
								farmId: farm.farmId,
								applicatorId: applicator.id,
								canView: farm.canView,
								canEdit: farm.canEdit,
							})),
					});
				} else {
					await tx.pendingFarmPermission.createMany({
						data: data.farmPermission
							.filter((farm) => farm.canView) // filter where canView is true
							.map((farm) => ({
								farmId: farm.farmId,
								inviteId: invite.id,
								canView: farm.canView,
								canEdit: farm.canEdit,
							})),
					});
				}
			} else {
				throw new ApiError(
					httpStatus.BAD_REQUEST,
					'An active invitation already exists.',
				);
			}
		} else {
			// Fresh invite logic remains unchanged
			invite = await tx.applicatorGrower.create({
				data: {
					applicatorId: applicator?.id ?? null,
					growerId: user.id,
					applicatorFirstName: applicator?.firstName ?? null,
					applicatorLastName: applicator?.lastName ?? null,
					growerFirstName: user.firstName,
					growerLastName: user.lastName,
					inviteStatus: shouldAutoAccept ? 'ACCEPTED' : 'PENDING',
					inviteInitiator: 'GROWER',
					canManageFarms: data.canManageFarms,
					inviteToken,
					expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
					email: userEmail,
				},
				select: { id: true },
			});

			if (data.farmPermission.length > 0) {
				if (shouldAutoAccept) {
					await tx.farmPermission.createMany({
						data: data.farmPermission
							.filter((farm) => farm.canView) // filter where canView is true
							.map((farm) => ({
								farmId: farm.farmId,
								applicatorId: applicator.id,
								canView: farm.canView,
								canEdit: farm.canEdit,
							})),
					});
				} else {
					await tx.pendingFarmPermission.createMany({
						data: data.farmPermission
							.filter((farm) => farm.canView) // filter where canView is true
							.map((farm) => ({
								farmId: farm.farmId,
								inviteId: invite.id,
								canView: farm.canView,
								canEdit: farm.canEdit,
							})),
					});
				}
			}
		}
		await tx.notification.create({
			data: {
				userId: applicator.id,
				type: 'ACCOUNT_INVITATION',
				inviteId: invite?.id,
			},
		});
	});

	// Send email invitation
	const inviteLink = `https://applicator-ac.netlify.app/invitationView?token=${inviteToken}`;
	const subject = 'Invitation Email';
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
		text: 'Request Invitation',
		html,
	});

	return { message: 'Invite sent successfully.' };
};

const sendInviteToGrower = async (
	currentUser: User,
	growerId: number,
	data: {
		firstName: string;
		lastName: string;
		canManageFarms: boolean;
		farmPermission: {
			farmId: number;
			canView: boolean;
			canEdit: boolean;
		}[];
	},
) => {
	const { id: applicatorId, role } = currentUser;
	const token = generateToken('GROWER');

	if (role !== 'APPLICATOR')
		return 'You are not allowed to perform this action.';
	const grower = await prisma.user.findUnique({
		where: { id: growerId, role: 'GROWER' },
	});
	if (!grower) {
		throw new ApiError(
			httpStatus.NOT_FOUND,
			'Grower with email not found.',
		);
	}
	const shouldAutoAccept = grower?.autoAcceptInvite;
	const existingInvite = await prisma.applicatorGrower.findUnique({
		where: {
			applicatorId_growerId: {
				growerId: growerId,
				applicatorId: applicatorId,
			},
		},
	});
	let invite: { id: number };
	await prisma.$transaction(async (tx) => {
		if (existingInvite) {
			if (existingInvite.inviteStatus === 'PENDING') {
				// Preserve previous farm permissions and canManageFarms flag
				invite = await tx.applicatorGrower.update({
					where: { id: existingInvite.id },
					data: {
						inviteStatus: shouldAutoAccept ? 'ACCEPTED' : 'PENDING',
						inviteToken: token,
						expiresAt: new Date(
							Date.now() + 3 * 24 * 60 * 60 * 1000,
						),
						inviteInitiator: 'APPLICATOR',
						// canManageFarms: existingInvite.canManageFarms, // Retain previous value
					},
					select: { id: true },
				});

				// Keep previous farm permissions
				// const previousPermissions =
				// 	await tx.pendingFarmPermission.findMany({
				// 		where: { inviteId: existingInvite.id },
				// 	});

				// await tx.pendingFarmPermission.deleteMany({
				// 	where: { inviteId: existingInvite.id },
				// });

				// await tx.pendingFarmPermission.createMany({
				// 	data: previousPermissions.map((farm) => ({
				// 		farmId: farm.farmId,
				// 		inviteId: invite.id,
				// 		canView: farm.canView,
				// 		canEdit: farm.canEdit,
				// 	})),
				// });
			} else if (
				existingInvite.inviteStatus === 'REJECTED' ||
				existingInvite.inviteStatus === 'DELETED_BY_GROWER' ||
				existingInvite.inviteStatus === 'DELETED_BY_APPLICATOR'
			) {
				// Overwrite with new farm permissions and canManageFarms flag
				invite = await tx.applicatorGrower.update({
					where: { id: existingInvite.id },
					data: {
						inviteStatus: shouldAutoAccept ? 'ACCEPTED' : 'PENDING',
						inviteToken: token,
						expiresAt: new Date(
							Date.now() + 3 * 24 * 60 * 60 * 1000,
						),
						inviteInitiator: 'APPLICATOR',
						canManageFarms: data.canManageFarms, // Use new value
					},
					select: { id: true },
				});

				// Overwrite farm permissions
				await tx.pendingFarmPermission.deleteMany({
					where: { inviteId: existingInvite.id },
				});
				if (shouldAutoAccept) {
					await tx.farmPermission.createMany({
						data: data.farmPermission
							.filter((farm) => farm.canView) // filter where canView is true
							.map((farm) => ({
								farmId: farm.farmId,
								applicatorId: applicatorId,
								canView: farm.canView,
								canEdit: farm.canEdit,
							})),
					});
				} else {
					await tx.pendingFarmPermission.createMany({
						data: data.farmPermission
							.filter((farm) => farm.canView) // filter where canView is true
							.map((farm) => ({
								farmId: farm.farmId,
								inviteId: invite.id,
								canView: farm.canView,
								canEdit: farm.canEdit,
							})),
					});
				}
			} else {
				throw new ApiError(
					httpStatus.BAD_REQUEST,
					'An active invitation already exists.',
				);
			}
		} else {
			// Fresh invite logic remains unchanged
			invite = await tx.applicatorGrower.create({
				data: {
					applicatorId: applicatorId,
					growerId: growerId,
					applicatorFirstName: currentUser.firstName ?? null,
					applicatorLastName: currentUser.lastName ?? null,
					growerFirstName: data.firstName,
					growerLastName: data.lastName,
					inviteStatus: shouldAutoAccept ? 'ACCEPTED' : 'PENDING',
					inviteInitiator: 'APPLICATOR',
					canManageFarms: data.canManageFarms,
					inviteToken: token,
					expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
					email: grower?.email,
				},
				select: { id: true },
			});

			if (data.farmPermission.length > 0) {
				if (shouldAutoAccept) {
					await tx.farmPermission.createMany({
						data: data.farmPermission
							.filter((farm) => farm.canView) // filter where canView is true
							.map((farm) => ({
								farmId: farm.farmId,
								applicatorId: applicatorId,
								canView: farm.canView,
								canEdit: farm.canEdit,
							})),
					});
				} else {
					await tx.pendingFarmPermission.createMany({
						data: data.farmPermission
							.filter((farm) => farm.canView) // filter where canView is true
							.map((farm) => ({
								farmId: farm.farmId,
								inviteId: invite.id,
								canView: farm.canView,
								canEdit: farm.canEdit,
							})),
					});
				}
			}
		}
		await tx.notification.create({
			data: {
				userId: grower.id, // Notify the appropriate user
				inviteId: invite.id,
				type: 'ACCOUNT_INVITATION',
			},
		});
	});

	const inviteLink = `https://grower-ac.netlify.app/#/invitationView?token=${token}`;
	const subject = 'Invitation Email';
	const message = `
  You are invited to join our platform!<br><br>
  Click the link below to join.<br><br>
  <a href="${inviteLink}">${inviteLink}</a><br><br>
  If you did not expect this invitation, please ignore this email.
`;
	if (grower) {
		const email = grower?.email;

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
			expiresAt: true,
			inviteToken: true,
			inviteInitiator: true,
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
							createdById: applicatorId,
							// permissions: {
							// 	some: {
							// 		applicatorId,
							// 	},
							// },
						},
						include: {
							permissions: {
								where: {
									applicatorId,
								},
							}, // Include permissions to calculate farm permissions for the applicator
							fields: true,
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
	// Add thumbnail at the top level of each field.
	if (grower?.grower?.farms) {
		for (const farm of grower.grower.farms) {
			for (const field of farm.fields) {
				// Try-catch in case config or properties are missing
				try {
					const config = field.config as any;
					if (config?.properties?.thumbnail) {
						(field as any).thumbnail = config.properties.thumbnail;
						(field as any).config = undefined;
					}
				} catch (error) {
					console.warn(
						'Failed to flatten thumbnail for field:',
						field.id,
						error,
					);
				}
			}
		}
	}

	// Calculate total acres for each grower and each farm
	const totalAcresByGrower = grower?.grower?.farms.reduce(
		(totalGrowerAcres, farm) => {
			// Calculate total acres for this farm
			const totalAcresByFarm = farm.fields.reduce(
				(totalFarmAcres, field) => {
					return totalFarmAcres.plus(new Decimal(field.acres || 0));
				},
				new Decimal(0),
			);

			// Type assertion to inform TypeScript about `totalAcres`
			(farm as any).totalAcres = totalAcresByFarm
				?.toDecimalPlaces(2)
				.toNumber();

			// Accumulate total grower acres
			return totalGrowerAcres.plus(totalAcresByFarm); // keep as decimal
		},
		new Decimal(0),
	);
	const responseData: ResponseData = { ...grower };
	if (grower) {
		if (grower.inviteStatus === 'PENDING') {
			const inviteLink = `https://grower-ac.netlify.app/#/invitationView?token=${grower.inviteToken}`;
			responseData.inviteUrl = inviteLink;
			responseData.isInviteExpired = grower.expiresAt
				? new Date(grower.expiresAt) <= new Date()
				: true;
		}
	}
	// Add total acres to the grower object
	return {
		...responseData,
		totalAcres: totalAcresByGrower?.toDecimalPlaces(2).toNumber(),
	};
};
const getPendingInvitesFromOthers = async (
	user: User,
	options: PaginateOptions & {
		label?: string;
		searchValue?: string;
	},
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
	console.log(type, 'type');
	//if pending invites from grower get by applicator
	if (type === 'GROWER') {
		const filters: Prisma.ApplicatorGrowerWhereInput = {
			applicatorId: user.id,
			inviteStatus: 'PENDING',
			inviteInitiator: 'APPLICATOR',
		};
		if (options.label && options.searchValue) {
			const searchFilter: Prisma.ApplicatorGrowerWhereInput = {};
			const searchValue = options.searchValue;
			if (options.label === 'all') {
				Object.assign(filters, {
					OR: [
						{
							grower: {
								OR: [
									{
										id: !isNaN(Number(searchValue))
											? parseInt(searchValue, 10)
											: undefined,
									},
									{
										fullName: {
											contains: searchValue,
											mode: 'insensitive',
										},
									},
									{
										firstName: {
											contains: searchValue,
											mode: 'insensitive',
										},
									},
									{
										lastName: {
											contains: searchValue,
											mode: 'insensitive',
										},
									},
									{
										email: {
											equals: searchValue,
											mode: 'insensitive',
										},
									},
									{
										phoneNumber: {
											contains: searchValue,
											mode: 'insensitive',
										},
									},
									{
										address1: {
											contains: searchValue,
											mode: 'insensitive',
										},
									},
								],
							},
						},
					],
				});
			} else {
				switch (options.label) {
					case 'growerId':
						searchFilter.growerId = parseInt(searchValue, 10);
						break;
					case 'growerName':
						searchFilter.grower = {
							OR: [
								{
									fullName: {
										contains: searchValue,
										mode: 'insensitive',
									},
								},
								{
									firstName: {
										contains: searchValue,
										mode: 'insensitive',
									},
								},
								{
									lastName: {
										contains: searchValue,
										mode: 'insensitive',
									},
								},
							],
						};
						break;

					case 'phoneNumber':
						searchFilter.grower = {
							phoneNumber: {
								contains: searchValue,
								mode: 'insensitive',
							},
						};
						break;
					case 'email':
						searchFilter.grower = {
							email: { equals: searchValue, mode: 'insensitive' },
						};
						break;
					case 'address1':
						searchFilter.grower = {
							address1: {
								contains: searchValue,
								mode: 'insensitive',
							},
						};
						break;
					default:
						throw new Error('Invalid label provided.');
				}
				Object.assign(filters, searchFilter); // Merge filters dynamically
			}
		}
		const pendingInvites = await prisma.applicatorGrower.findMany({
			where: filters,
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
							return totalFarmAcres.plus(
								new Decimal(field.acres || 0),
							);
						},
						new Decimal(0),
					);
					return totalGrowerAcres.plus(totalAcresByFarm); // keep as decimal
				},
				new Decimal(0),
			);

			// Return the grower object without farms
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const { farms, ...growerWithoutFarms } = grower.grower || {};

			return {
				...grower,
				grower: {
					...growerWithoutFarms,
					firstName: grower.growerFirstName,
					lastName: grower.growerLastName,
					fullName: `${grower.growerFirstName} ${grower.growerLastName}`,
				},
				totalAcres: totalAcresByGrower?.toDecimalPlaces(2).toNumber(),
			};
		});
		const totalResults = await prisma.applicatorGrower.count({
			where: filters,
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
		const filters: Prisma.ApplicatorGrowerWhereInput = {
			growerId: user.id,
			inviteStatus: 'PENDING',
			inviteInitiator: 'GROWER',
		};
		if (options.label && options.searchValue) {
			const searchFilter: Prisma.ApplicatorGrowerWhereInput = {};
			const searchValue = options.searchValue;
			if (options.label === 'all') {
				Object.assign(filters, {
					OR: [
						{
							applicator: {
								OR: [
									{
										id: !isNaN(Number(searchValue))
											? parseInt(searchValue, 10)
											: undefined,
									},
									{
										fullName: {
											contains: searchValue,
											mode: 'insensitive',
										},
									},
									{
										firstName: {
											contains: searchValue,
											mode: 'insensitive',
										},
									},
									{
										lastName: {
											contains: searchValue,
											mode: 'insensitive',
										},
									},
									{
										email: {
											equals: searchValue,
											mode: 'insensitive',
										},
									},
									{
										phoneNumber: {
											contains: searchValue,
											mode: 'insensitive',
										},
									},
									{
										address1: {
											contains: searchValue,
											mode: 'insensitive',
										},
									},
								],
							},
						},
					],
				});
			} else {
				switch (options.label) {
					case 'applicatorId':
						searchFilter.applicatorId = parseInt(searchValue, 10);
						break;
					case 'applicatorName':
						searchFilter.applicator = {
							OR: [
								{
									fullName: {
										contains: searchValue,
										mode: 'insensitive',
									},
								},
								{
									firstName: {
										contains: searchValue,
										mode: 'insensitive',
									},
								},
								{
									lastName: {
										contains: searchValue,
										mode: 'insensitive',
									},
								},
							],
						};
						break;

					case 'phoneNumber':
						searchFilter.applicator = {
							phoneNumber: {
								contains: searchValue,
								mode: 'insensitive',
							},
						};
						break;
					case 'email':
						searchFilter.applicator = {
							email: { equals: searchValue, mode: 'insensitive' },
						};
						break;
					case 'address':
						searchFilter.applicator = {
							address1: {
								contains: searchValue,
								mode: 'insensitive',
							},
						};
						break;
					default:
						throw new Error('Invalid label provided.');
				}

				Object.assign(filters, searchFilter); // Merge filters dynamically
			}
		}
		const pendingInvites = await prisma.applicatorGrower.findMany({
			where: filters,
			select: {
				applicatorFirstName: true,
				applicatorLastName: true,
				inviteStatus: true,
				isArchivedByGrower: true,
				email: true,
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
				(totalGrowerAcres, farm) => {
					const totalAcresByFarm = farm.fields.reduce(
						(totalFarmAcres, field) => {
							return totalFarmAcres.plus(
								new Decimal(field.acres || 0),
							);
						},
						new Decimal(0),
					);
					return totalGrowerAcres.plus(totalAcresByFarm); // keep as decimal
				},
				new Decimal(0),
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
				totalAcres: totalAcresByGrower?.toDecimalPlaces(2).toNumber(),
			};
		});

		const totalResults = await prisma.applicatorGrower.count({
			where: filters,
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

	// Fetch user based on role
	if (role === 'GROWER') {
		const invite = await prisma.applicatorGrower.findFirst({
			where: {
				inviteToken: token,
				expiresAt: {
					gte: new Date(), // Ensures the invite is still valid
				},
				// grower: {
				// 	is: {
				// 		profileStatus: 'INCOMPLETE',
				// 	},
				// },
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
				pendingFarmPermission: {
					select: {
						farmId: true,
						canEdit: true,
						canView: true,
						farm: {
							select: {
								name: true,
							},
						},
					},
				},
			},
		});
		if (!invite) {
			throw new ApiError(
				httpStatus.NOT_FOUND,
				'User not found or invite expired.',
			);
		}
		const user = invite?.grower;
		const applicator = invite?.applicator;

		// If no user is found, throw an error
		if (!user) {
			throw new ApiError(
				httpStatus.NOT_FOUND,
				'User not found or invite expired.',
			);
		}
		const { state } = user;
		const flattenedPerissions = invite.pendingFarmPermission.map(
			(farmPermission) => {
				const { farm, ...permission } = farmPermission;
				return {
					farmName: farm.name,
					...permission,
				};
			},
		);
		// Return only the role-specific user data
		return {
			...user,
			state: state?.name,
			applicator,
			isAlreadyExist:
				invite.grower.profileStatus === 'COMPLETE' ? true : false,
			pendingFarmPermissions: flattenedPerissions,
		};
	} else if (role === 'APPLICATOR') {
		const invite = await prisma.applicatorGrower.findFirst({
			where: {
				inviteToken: token,
				expiresAt: {
					gte: new Date(), // Ensures the invite is still valid
				},
			},
			select: {
				email: true,
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
				pendingFarmPermission: {
					select: {
						canView: true,
						canEdit: true,
						farm: {
							select: {
								name: true,
							},
						},
					},
				},
			},
		});
		if (!invite) {
			throw new ApiError(
				httpStatus.NOT_FOUND,
				'User not found or invite expired.',
			);
		}

		const user = invite?.applicator;
		const grower = invite?.grower;
		const flattenedPerissions = invite.pendingFarmPermission.map(
			(farmPermission) => {
				const { farm, ...permission } = farmPermission;
				return {
					farmName: farm.name,
					...permission,
				};
			},
		);

		// If no user is found, throw an error
		if (user) {
			const { state } = user;
			// Return only the role-specific user data
			return {
				...user,
				state: state?.name,
				// applicator,
				grower,
				isAlreadyExist: true,
				pendingFarmPermissions: flattenedPerissions,
			};
		} else {
			return {
				// applicator,
				email: invite?.email,
				grower,
				isAlreadyExist: false,
				pendingFarmPermissions: flattenedPerissions,
			};
		}
	} else if (role === 'WORKER') {
		const invite = await prisma.applicatorWorker.findUnique({
			where: {
				inviteToken: token,
				expiresAt: {
					gte: new Date(), // Ensures the invite is still valid
				},
				// worker: {
				// 	is: {
				// 		profileStatus: 'INCOMPLETE',
				// 	},
				// },
			},
			select: {
				pilotPestLicenseNumber: true,
				pilotLicenseNumber: true,
				businessLicenseNumber: true,
				planeOrUnitNumber: true,
				percentageFee: true,
				dollarPerAcre: true,
				autoAcceptJobs: true,
				canViewPricingDetails: true,
				code: true,
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
		if (!invite) {
			throw new ApiError(
				httpStatus.NOT_FOUND,
				'User not found or invite expired.',
			);
		}
		const { worker, ...woerkerData } = invite;
		const { state } = worker;
		const applicator = invite?.applicator;
		return {
			...worker,
			...woerkerData,
			state: state?.name,
			applicator,
			isAlreadyExist:
				invite?.worker.profileStatus === 'COMPLETE' ? true : false,
		};
	} else if (role === 'APPLICATOR_USER') {
		const invite = await prisma.applicatorUser.findUnique({
			where: {
				inviteToken: token,
				// expiresAt: {
				// 	gte: new Date(), // Ensures the invite is still valid
				// },
				user: {
					is: {
						profileStatus: 'INCOMPLETE',
					},
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
				user: {
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
		if (!invite) {
			throw new ApiError(
				httpStatus.NOT_FOUND,
				'User not found or invite expired.',
			);
		}
		const { user, ...userData } = invite;
		const { state } = user;
		const applicator = invite?.applicator;
		return {
			...user,
			...userData,
			state: state?.name,
			applicator,
			isAlreadyExist:
				invite?.user.profileStatus === 'COMPLETE' ? true : false,
		};
	} else {
		throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid role in token.');
	}
};

const getWeather = async (user: User, options: City) => {
	const OPEN_WEATHER_API_KEY = config.openWeatherKey;

	const userData = await prisma.user.findUnique({
		where: { id: user.id },
		select: { township: true },
	});

	const cityName = options.city || userData?.township;

	// Get latitude & longitude
	const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${cityName}&limit=1&appid=${OPEN_WEATHER_API_KEY}`;
	const geoResponse = await axios.get(geoUrl);
	const { lat, lon } = geoResponse.data[0];

	// Fetch 5-day weather forecast
	const weatherUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${cityName}&units=imperial&appid=${OPEN_WEATHER_API_KEY}`;
	const weatherResponse = await axios.get(weatherUrl);
	const weatherData = weatherResponse.data.list;
	const timezoneOffset = weatherResponse.data.city.timezone; // in seconds

	// Fetch AQI data
	const aqiUrl = `https://api.openweathermap.org/data/2.5/air_pollution/forecast?lat=${lat}&lon=${lon}&appid=${OPEN_WEATHER_API_KEY}`;
	const aqiResponse = await axios.get(aqiUrl);
	const aqiData = aqiResponse.data.list;

	// Group weather data by date
	const groupedWeather: Record<string, any> = {};
	const degToCompass = (deg: number) => {
		const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
		const index = Math.round(deg / 45) % 8;
		return directions[index];
	};

	weatherData.forEach((item: any) => {
		// Convert UTC timestamp to local time using timezone offset
		const localDateObj = new Date((item.dt + timezoneOffset) * 1000);
		const date = localDateObj.toISOString().split('T')[0];

		const hours = localDateObj.getHours();
		const minutes = localDateObj.getMinutes().toString().padStart(2, '0');
		const hour12 = hours % 12 || 12;
		const ampm = hours >= 12 ? 'PM' : 'AM';
		const time12 = `${hour12}:${minutes} ${ampm}`;

		if (!groupedWeather[date]) {
			item.wind.speed = +(item.wind.speed * 1.60934).toFixed(2); // Converting miles to Kilometer
			item.wind.gust = +(item.wind.gust * 1.60934).toFixed(2); // Converting miles to Kilometer
			item.wind.direction = degToCompass(item.wind.deg);

			// item.wind.speed = windSpeed.toFixed(2);
			groupedWeather[date] = {
				day: localDateObj.toLocaleDateString('en-US', {
					weekday: 'long',
				}),
				date: localDateObj.toISOString(),
				minTemp: item.main.temp,
				maxTemp: item.main.temp,
				description: item.weather[0].description,
				icon: item.weather[0].icon,
				hourly: [],
				aqi: null,
				city: cityName,
				wind: item.wind,
			};
		}

		groupedWeather[date].minTemp = Math.min(
			groupedWeather[date].minTemp,
			item.main.temp,
		);
		groupedWeather[date].maxTemp = Math.max(
			groupedWeather[date].maxTemp,
			item.main.temp,
		);

		groupedWeather[date].hourly.push({
			time: time12,
			temperature: item.main.temp,
			description: item.weather[0].description,
			icon: item.weather[0].icon,
			wind: {
				speed: +(item.wind.speed * 1.60934).toFixed(2),
				deg: item.wind.deg,
				gust: +(item.wind.gust * 1.60934).toFixed(2),
				direction: degToCompass(item.wind.deg),
			},
		});
	});

	// Match AQI data
	aqiData.forEach((aqiItem: any) => {
		const localAqiDate = new Date((aqiItem.dt + timezoneOffset) * 1000)
			.toISOString()
			.split('T')[0];
		if (groupedWeather[localAqiDate]) {
			groupedWeather[localAqiDate].aqi = aqiItem.main.aqi * 10;
		}
	});

	const formattedWeather = Object.values(groupedWeather);
	return { weather: formattedWeather };
};

const getWeatherV2 = async (user: User, options: City) => {
	const WEATHER_API_KEY = '91e5c8a58b6143ed85a121257252407'; // Replace with your key

	const userData = await prisma.user.findUnique({
		where: { id: user.id },
		select: { township: true },
	});

	const cityName = options.city || userData?.township;

	const weatherUrl = `http://api.weatherapi.com/v1/forecast.json?key=${WEATHER_API_KEY}&q=${cityName}&days=3&aqi=yes`;
	const response = await axios.get(weatherUrl);
	const data = response.data;

	const forecastDays = data.forecast.forecastday;

	const degToCompass = (deg: number) => {
		const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
		const index = Math.round(deg / 45) % 8;
		return directions[index];
	};

	const groupedWeather: Record<string, any> = {};

	forecastDays.forEach((day: any) => {
		const date = day.date;
		const dateObj = new Date(day.date);
		const dayInfo = day.day;
		const hourlyData = day.hour;

		groupedWeather[date] = {
			day: dateObj.toLocaleDateString('en-US', { weekday: 'long' }),
			date: dateObj.toISOString(),
			minTemp: dayInfo.mintemp_c,
			maxTemp: dayInfo.maxtemp_c,
			description: dayInfo.condition.text,
			icon: dayInfo.condition.icon,
			hourly: [],
			aqi: day.hour[0]?.air_quality?.pm2_5 ? Math.round(day.hour[0].air_quality.pm2_5) : null,
			city: data.location.name,
			wind: {
				speed: dayInfo.maxwind_kph,
				direction: degToCompass(day.hour[0].wind_degree),
				deg: day.hour[0].wind_degree,
				gust: +(day.hour[0].gust_kph).toFixed(2),
			},
		};

		hourlyData.forEach((hour: any) => {
			const time = new Date(hour.time);
			const hours = time.getHours();
			const minutes = time.getMinutes().toString().padStart(2, '0');
			const hour12 = hours % 12 || 12;
			const ampm = hours >= 12 ? 'PM' : 'AM';
			const time12 = `${hour12}:${minutes} ${ampm}`;

			groupedWeather[date].hourly.push({
				time: time12,
				temperature: hour.temp_c,
				description: hour.condition.text,
				icon: hour.condition.icon,
				wind: {
					speed: hour.wind_kph,
					gust: +(hour.gust_kph).toFixed(2),
					deg: hour.wind_degree,
					direction: degToCompass(hour.wind_degree),
				},
			});
		});
	});

	const formattedWeather = Object.values(groupedWeather);
	return { weather: formattedWeather };
};
const acceptOrRejectInviteThroughEmail = async (
	token: string,
	inviteStatus: InviteStatus,
	canManageFarms: boolean,
	farmPermissions: {
		farmId: number;
		canView: boolean;
		canEdit: boolean;
	}[],
) => {
	// Verify token and extract role
	const role = verifyInvite(token);
	if (!role) {
		throw new ApiError(
			httpStatus.UNAUTHORIZED,
			'Invalid or expired token.',
		);
	}

	if (role === 'GROWER') {
		if (inviteStatus === 'ACCEPTED') {
			await prisma.$transaction(async (prisma) => {
				// Update the inviteStatus field
				const invite = await prisma.applicatorGrower.update({
					where: {
						inviteToken: token,
						inviteStatus: 'PENDING',
						// grower: {
						// 	profileStatus: 'INCOMPLETE',
						// },
					},
					data: {
						inviteStatus, // Only updating the inviteStatus field
						canManageFarms:
							canManageFarms !== undefined
								? canManageFarms
								: true,
					},
					select: {
						id: true,
						applicator: {
							select: {
								id: true,
								state: { select: { name: true } },
							},
						},
						pendingFarmPermission: true,
					},
				});

				// Ensure `applicator` exists before proceeding
				if (!invite.applicator || invite.applicator.id === undefined) {
					throw new Error('Applicator ID is missing');
				}

				// Ensure `pendingFarmPermission` is an array before mapping over it
				if (
					Array.isArray(invite.pendingFarmPermission) &&
					invite.pendingFarmPermission.length > 0
				) {
					await prisma.farmPermission.createMany({
						data: farmPermissions
							.filter((farm) => farm.canView) // filter where canView is true
							.map((perm) => ({
								farmId: perm.farmId,
								applicatorId: invite.applicator?.id ?? 0, // ✅ Use safe optional chaining with a default value
								canView: perm.canView,
								canEdit: perm.canEdit,
							})),
					});
				}

				// Delete pending permissions only if `invite.id` is valid
				await prisma.pendingFarmPermission.deleteMany({
					where: { inviteId: invite.id },
				});
				//Expire the invite
				await prisma.applicatorGrower.update({
					where: { id: invite.id },
					data: { inviteToken: null, expiresAt: null },
				});
				await prisma.notification.create({
					data: {
						userId: invite.applicator.id, // Notify the appropriate user
						inviteId: invite.id,
						type: 'ACCEPT_INVITE',
					},
				});
			});
		} else if (inviteStatus === 'REJECTED') {
			await prisma.$transaction(async (prisma) => {
				const invite = await prisma.applicatorGrower.update({
					where: {
						inviteToken: token,
						inviteStatus: 'PENDING',
						// grower: {
						// 	profileStatus: 'INCOMPLETE',
						// },
					},
					data: {
						inviteStatus,
					},
					select: {
						id: true,
						applicator: {
							select: { id: true },
						},
					},
				});
				// Delete pending permissions only if `invite.id` is valid
				await prisma.pendingFarmPermission.deleteMany({
					where: { inviteId: invite.id },
				});
				// Ensure `applicator` exists
				if (!invite.applicator?.id) {
					throw new Error('Applicator ID is missing');
				}
				await prisma.notification.create({
					data: {
						userId: invite?.applicator?.id, // Notify the appropriate user
						inviteId: invite.id,
						type: 'REJECT_INVITE',
					},
				});
				await prisma.applicatorGrower.update({
					where: { id: invite.id },
					data: { inviteToken: null, expiresAt: null },
				});
			});
		}
	} else if (role === 'APPLICATOR') {
		if (inviteStatus === 'ACCEPTED') {
			await prisma.$transaction(async (prisma) => {
				const invite = await prisma.applicatorGrower.update({
					where: {
						inviteToken: token,
						inviteStatus: 'PENDING',
					},
					data: {
						inviteStatus,
					},
					select: {
						id: true,
						applicator: {
							select: {
								id: true,
								state: { select: { name: true } },
							},
						},
						grower: {
							select: { id: true },
						},
						pendingFarmPermission: true,
					},
				});
				await prisma.notification.create({
					data: {
						userId: invite?.grower?.id, // Notify the appropriate user
						inviteId: invite.id,
						type: 'ACCEPT_INVITE',
					},
				});
				// Delete pending permissions only if `invite.id` is valid
				await prisma.pendingFarmPermission.deleteMany({
					where: { inviteId: invite.id },
				});

				// Ensure `applicator` exists
				if (!invite.applicator?.id) {
					throw new Error('Applicator ID is missing');
				}

				// Transfer pending farm permissions if they exist
				if (
					Array.isArray(invite.pendingFarmPermission) &&
					invite.pendingFarmPermission.length > 0
				) {
					await prisma.farmPermission.createMany({
						data: invite.pendingFarmPermission.map((perm) => ({
							farmId: perm.farmId,
							applicatorId: invite?.applicator?.id ?? 0,
							canView: perm.canView,
							canEdit: perm.canEdit,
						})),
					});

					// Remove pending permissions after transfer
					await prisma.pendingFarmPermission.deleteMany({
						where: { inviteId: invite.id },
					});
				}
			});
		}
		if (inviteStatus === 'REJECTED') {
			await prisma.$transaction(async (prisma) => {
				const invite = await prisma.applicatorGrower.update({
					where: {
						inviteToken: token,
						inviteStatus: 'PENDING',
					},
					data: {
						inviteStatus,
					},
					select: {
						id: true,
						grower: {
							select: { id: true },
						},
					},
				});
				// Delete pending permissions only if `invite.id` is valid
				await prisma.pendingFarmPermission.deleteMany({
					where: { inviteId: invite.id },
				});
				await prisma.notification.create({
					data: {
						userId: invite?.grower?.id, // Notify the appropriate user
						inviteId: invite.id,
						type: 'REJECT_INVITE',
					},
				});
				await prisma.applicatorGrower.update({
					where: { id: invite.id },
					data: { inviteToken: null, expiresAt: null },
				});
			});
		}
	} else if (role === 'WORKER') {
		if (inviteStatus === 'ACCEPTED') {
			await prisma.$transaction(async (prisma) => {
				// Update the inviteStatus field
				const invite = await prisma.applicatorWorker.update({
					where: {
						inviteToken: token,
						inviteStatus: 'PENDING',
						// worker: {
						// 	profileStatus: 'INCOMPLETE',
						// },
					},
					data: {
						inviteStatus, // Only updating the inviteStatus field
					},
					select: {
						id: true,
						applicator: {
							select: {
								id: true,
								state: { select: { name: true } },
							},
						},
					},
				});
				// Ensure `applicator` exists before proceeding
				//expire invite after accepted
				await prisma.applicatorWorker.update({
					where: { id: invite.id },
					data: { inviteToken: null, expiresAt: null },
				});
				await prisma.notification.create({
					data: {
						userId: invite.applicator.id, // Notify the appropriate user
						inviteId: invite.id,
						type: 'ACCEPT_INVITE',
					},
				});
			});
		} else if (inviteStatus === 'REJECTED') {
			await prisma.$transaction(async (prisma) => {
				const invite = await prisma.applicatorWorker.update({
					where: {
						inviteToken: token,
						inviteStatus: 'PENDING',
						worker: {
							profileStatus: 'INCOMPLETE',
						},
					},
					data: {
						inviteStatus,
					},
					select: {
						id: true,
						applicator: {
							select: {
								id: true,
							},
						},
					},
				});
				await prisma.applicatorWorker.update({
					where: { id: invite.id },
					data: { inviteToken: null, expiresAt: null },
				});
				await prisma.notification.create({
					data: {
						userId: invite?.applicator?.id, // Notify the appropriate user
						inviteId: invite.id,
						type: 'REJECT_INVITE',
					},
				});
			});
		}
	}

	return {
		message: `Invite ${inviteStatus.toLowerCase()} successfully.`,
	};
};
const getApplicatorById = async (user: User, applicatorId: number) => {
	if (user.role === 'WORKER') {
		const applicator = await prisma.applicatorWorker.findUnique({
			where: {
				applicatorId_workerId: {
					applicatorId,
					workerId: user.id,
				},
			},
			select: {
				inviteStatus: true,
				pilotPestLicenseNumber: true,
				businessLicenseNumber: true,
				pilotLicenseNumber: true,
				planeOrUnitNumber: true,
				percentageFee: true,
				dollarPerAcre: true,
				autoAcceptJobs: true,
				canViewPricingDetails: true,
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
		});
		if (!applicator) {
			throw new ApiError(httpStatus.NOT_FOUND, 'Invalid data provided.');
		}

		return {
			inviteStatus: applicator.inviteStatus,
			pilotPestLicenseNumber: applicator.pilotPestLicenseNumber,
			businessLicenseNumber: applicator.businessLicenseNumber,
			pilotLicenseNumber: applicator.pilotLicenseNumber,
			planeOrUnitNumber: applicator.planeOrUnitNumber,
			percentageFee: applicator.percentageFee,
			dollarPerAcre: applicator.dollarPerAcre,
			autoAcceptJobs: applicator.autoAcceptJobs,
			canViewPricingDetails: applicator.canViewPricingDetails,
			...applicator.applicator,
			state: applicator.applicator?.state?.name ?? null,
		};
	}
	// Todo: udpate this condition to get applciator for grower
	if (user.role === 'GROWER') {
		const farms = await prisma.farm.findMany({
			where: {
				growerId: user.id,
				permissions: {
					some: {
						applicatorId,
					},
				},
			},
			select: {
				id: true,
				name: true,
				permissions: {
					where: {
						applicatorId,
					},
					select: {
						id: true,
						canView: true,
						canEdit: true,
					},
				},
			},
		});

		const applicator = await prisma.applicatorGrower.findUnique({
			where: {
				applicatorId_growerId: {
					applicatorId,
					growerId: user.id,
				},
			},
			select: {
				applicatorFirstName: true,
				applicatorLastName: true,
				inviteStatus: true,
				isArchivedByGrower: true,
				canManageFarms: true,
				inviteToken: true,
				email: true,
				expiresAt: true,
				inviteInitiator: true,
				applicator: {
					include: {
						state: {
							select: {
								id: true,
								name: true,
							},
						},
						// farmPermissions: {
						// 	// where: {
						// 	// 	applicatorId,
						// 	// },
						// 	select: {
						// 		farmId: true,
						// 		canEdit: true,
						// 		canView: true,
						// 		farm: {
						// 			select: {
						// 				name: true,
						// 			},
						// 		},
						// 	},
						// },
					},
					omit: {
						stateId: true,
						password: true, // Exclude sensitive data
					},
				},
				pendingFarmPermission: {
					select: {
						farmId: true,
						canEdit: true,
						canView: true,
						farm: {
							select: {
								name: true,
							},
						},
					},
				},
			},
		});
		const formattedResponse = {
			...applicator,
			applicator: {
				...applicator?.applicator,
				farmPermissions: [
					...(farms?.map((fp) => ({
						farmId: fp.id,
						farmName: fp.name,
						canView: fp.permissions[0]?.canView,
						canEdit: fp.permissions[0]?.canEdit,
					})) || []),
				],
				pendingFarmPermissions: [
					...(applicator?.pendingFarmPermission?.map((fp) => ({
						farmId: fp.farmId,
						canView: fp.canView,
						canEdit: fp.canEdit,
						farmName: fp.farm?.name ?? null, // Add farm name if exists
					})) || []),
				],
			},
			pendingFarmPermission: undefined,
		};

		return {
			result: formattedResponse,
		};
	}
};

interface UserStateData {
	state: string;
	userPercent: number;
	color?: string;
}

const getUsersByState = async (user: User) => {
	const { id, role } = user;

	let users: any[] = [];

	if (role === 'APPLICATOR') {
		users = await prisma.applicatorGrower.findMany({
			where: {
				applicatorId: id,
				inviteStatus: 'ACCEPTED',
				grower: { role: 'GROWER' },
			},
			select: {
				grower: {
					select: {
						state: true,
					},
				},
			},
		});
	} else if (role === 'GROWER') {
		users = await prisma.applicatorGrower.findMany({
			where: {
				growerId: id,
				inviteStatus: 'ACCEPTED',
				applicator: { role: 'APPLICATOR' },
			},
			select: {
				applicator: {
					select: {
						state: true,
					},
				},
			},
		});
	} else if (role === 'WORKER') {
		users = await prisma.applicatorWorker.findMany({
			where: {
				workerId: id,
				inviteStatus: 'ACCEPTED',
				applicator: { role: 'APPLICATOR' },
			},
			select: {
				applicator: {
					select: {
						state: true,
					},
				},
			},
		});
	} else {
		throw new Error('Invalid user role');
	}

	// Count users by state
	const stateCount: Record<string, number> = {};

	for (const item of users) {
		let stateObj;

		if (role === 'APPLICATOR') {
			stateObj = item?.grower?.state;
		} else {
			stateObj = item?.applicator?.state;
		}

		const stateName =
			typeof stateObj === 'string'
				? stateObj
				: stateObj?.name || 'Unknown';

		stateCount[stateName] = (stateCount[stateName] || 0) + 1;
	}

	const totalUsers = users.length;

	const data: UserStateData[] = Object.entries(stateCount).map(
		([state, count]) => ({
			state,
			userPercent: totalUsers
				? +((count / totalUsers) * 100).toFixed(2)
				: 0,
		}),
	);

	// Generate consistent colors based on sorted percentages
	const colorMap = generateColorMapFromPercent(data);

	// Add colors to data
	const finalData = data.map((entry) => ({
		...entry,
		color: colorMap[entry.state] || '#ccc',
	}));

	return finalData;
};
const updateGrowerName = async (
	user: User,
	data: {
		firstName: string;
		lastName: string;
	},
	growerId: number,
) => {
	const { id, role } = user;
	if (role === 'APPLICATOR') {
		const existingRelation = await prisma.applicatorGrower.findUnique({
			where: {
				applicatorId_growerId: {
					applicatorId: id,
					growerId,
				},
			},
		});

		if (!existingRelation) {
			throw new ApiError(
				httpStatus.NOT_FOUND,
				'Grower relation not found for this applicator.',
			);
		}

		const updatedUser = await prisma.applicatorGrower.update({
			where: {
				applicatorId_growerId: {
					applicatorId: id,
					growerId,
				},
			},
			data: {
				growerFirstName: data.firstName,
				growerLastName: data.lastName,
			},
		});

		return {
			data: {
				firstName: updatedUser.growerFirstName,
				lastName: updatedUser.growerLastName,
			},
			message: 'Grower name updated successfully.',
		};
	} else {
		throw new ApiError(
			httpStatus.FORBIDDEN,
			'Only applicators can update grower names.',
		);
	}
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
	getWeatherV2,
	acceptOrRejectInviteThroughEmail,
	getApplicatorById,
	getUsersByState,
	updateGrowerName,
};
