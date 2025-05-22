/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import ApiError from '../../../../../shared/utils/api-error';
import { prisma } from '../../../../../shared/libs/prisma-client';
import { CertificationType } from '@prisma/client';
import config from '../../../../../shared/config/env-config';
import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';
import { v4 as uuidv4 } from 'uuid';

const createCertification = async (userId: number, data: any) => {
	const created = await prisma.certification.create({
		data: {
			...data,
			userId,
		},
		include: { state: true },
	});

	return {
		...created,
		stateName: created.state?.name || null,
		state: undefined, // remove nested object
	};
};

const getAllCertifications = async (userId: number) => {
	const certifications = await prisma.certification.findMany({
		where: { userId },
		include: { state: true },
		orderBy: { id: 'desc' },
	});

	return certifications.map((cert) => ({
		...cert,
		stateName: cert.state?.name || null,
		state: undefined,
	}));
};

const getCertificationById = async (userId: number, id: number) => {
	const cert = await prisma.certification.findFirstOrThrow({
		where: { id, userId },
		include: { state: true },
	});

	return {
		...cert,
		stateName: cert.state?.name || null,
		state: undefined,
	};
};

const updateCertification = async (userId: number, id: number, data: any) => {
	await prisma.certification.findFirstOrThrow({ where: { id, userId } });
	const updated = await prisma.certification.update({
		where: { id },
		data,
		include: { state: true },
	});

	return {
		...updated,
		stateName: updated.state?.name || null,
		state: undefined,
	};
};

const deleteCertification = async (userId: number, id: number) => {
	await prisma.certification.findFirstOrThrow({ where: { id, userId } });
	await prisma.certification.delete({ where: { id } });
	return {
		result: 'Certification deleted successfully',
	};
};

const getCertificationTypes = async () => {
	const jobStatusList = Object.values(CertificationType).map(
		(type, index) => ({
			id: index + 1,
			name: type,
		}),
	);

	return jobStatusList;
};

const uploadCertification = async (
	userId: number,
	files: Express.Multer.File[],
) => {
	// make connection with azure storage account for storage access
	const storageUrl = config.azureStorageUrl;
	const containerName = config.azureContainerName;
	const blobServiceClient =
		BlobServiceClient.fromConnectionString(storageUrl);
	const containerClient: ContainerClient =
		blobServiceClient.getContainerClient(containerName);

	//  upload all file parralled at one by using promis.all
	const uploadedFiles = await Promise.all(
		files.map(async (file) => {
			// Generate unique blob names by using uniue id uuidv4
			const blobName = `certifications/${uuidv4()}_${file.originalname}`;

			const blockBlobClient =
				containerClient.getBlockBlobClient(blobName);
			await blockBlobClient.upload(file.buffer, file.buffer.length, {
				blobHTTPHeaders: {
					blobContentType: file.mimetype,
				},
			});
			return `/${containerName}/${blobName}`;
		}),
	);
	return uploadedFiles;
};

export default {
	createCertification,
	getAllCertifications,
	getCertificationById,
	updateCertification,
	deleteCertification,
	getCertificationTypes,
	uploadCertification,
};
