/* eslint-disable @typescript-eslint/no-explicit-any */
// import httpStatus from 'http-status';
// import ApiError from '../../../../../shared/utils/api-error';
import { prisma } from '../../../../../shared/libs/prisma-client';
import { CertificationType } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { getUploader } from '../../../../../shared/helpers/uploaderFactory';

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
): Promise<string[]> => {
	const uploader = getUploader();
	const uploadObjects = files.map((file) => ({
		Key: `certifications/${userId}/${uuidv4()}_${file.originalname}`, // ✅ no leading slash
		Body: file.buffer,
		ContentType: file.mimetype,
	}));

	const uploadedFiles = await uploader(uploadObjects);

	return uploadedFiles; // returns blob paths like `certifications/userId/...`
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
