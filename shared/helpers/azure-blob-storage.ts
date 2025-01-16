import {
	BlobServiceClient,
	ContainerClient,
	BlockBlobClient,
} from '@azure/storage-blob';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import { Readable } from 'stream';
import { User } from '@prisma/client';
// import { MulterFile } from './types'; // Assume you have a custom type for Multer files
import config from '../config/env-config';

interface MulterFile {
	originalname: string;
	mimetype: string;
	buffer: Buffer;
}

const storageUrl = config.azureStorageUrl;
const containerName = config.azureContainerName;

const blobServiceClient = BlobServiceClient.fromConnectionString(storageUrl);
const containerClient: ContainerClient =
	blobServiceClient.getContainerClient(containerName);

export const deleteBlob = async (fileName: string): Promise<void> => {
	const blockBlobClient: BlockBlobClient =
		containerClient.getBlockBlobClient(fileName);
	await blockBlobClient.delete();
};

export const uploadImageBlob = async (
	jwtUser: User,
	file: MulterFile,
	genThumbnail = false,
): Promise<{ image: string; thumbnail: string | null }> => {
	const path = `users/${jwtUser.id}`;
	const blobName = `${uuidv4()}_${file.originalname}`;
	const thumbnailBlobName = `thumbnail_${blobName}`;
	const sharpImage = sharp(file.buffer);

	const options = {
		blobHTTPHeaders: {
			blobContentType: file.mimetype,
		},
	};

	const imageBuffer = await sharpImage.toBuffer();
	const imageStream = new Readable();
	imageStream.push(imageBuffer);
	imageStream.push(null);

	const blobClient = containerClient.getBlockBlobClient(
		`${path}/${blobName}`,
	);
	await blobClient.uploadStream(imageStream, 1 * 1024 * 1024, 20, {
		...options,
	});

	let thumbnailUrl: string | null = null;
	if (genThumbnail) {
		const imageMetadata = await sharpImage.metadata();
		const thumbnailSize = Math.min(
			imageMetadata.width || 0,
			imageMetadata.height || 0,
		);
		const left = Math.floor(
			((imageMetadata.width || 0) - thumbnailSize) / 2,
		);
		const top = Math.floor(
			((imageMetadata.height || 0) - thumbnailSize) / 2,
		);

		const thumbnailBuffer = await sharpImage
			.extract({ left, top, width: thumbnailSize, height: thumbnailSize })
			.resize({ width: 50, height: 50, fit: 'cover' })
			.toBuffer();

		const thumbnailBlobClient = containerClient.getBlockBlobClient(
			`${path}/${thumbnailBlobName}`,
		);
		await thumbnailBlobClient.upload(
			thumbnailBuffer,
			thumbnailBuffer.length,
			options,
		);

		thumbnailUrl = `/${containerName}/${path}/${thumbnailBlobName}`;
	}

	return {
		image: `/${containerName}/${path}/${blobName}`,
		thumbnail: thumbnailUrl,
	};
};

export const createBlobForDeletedItems = async (
	folderName: string,
	file: MulterFile,
): Promise<{ itemUrl: string }> => {
	const blobName = `deletedItems/${folderName}/${file.originalname.replace(/\s/g, '')}`;
	const blockBlobClient = containerClient.getBlockBlobClient(blobName);
	await blockBlobClient.upload(file.buffer, file.buffer.length, {
		blobHTTPHeaders: {
			blobContentType: file.mimetype,
		},
	});

	return {
		itemUrl: `/${containerName}/${blobName}`,
	};
};
