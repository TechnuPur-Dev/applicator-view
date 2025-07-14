import { BlobServiceClient, BlockBlobClient } from '@azure/storage-blob';
import config from '../config/env-config';

const storageUrl = config.azure.storageUrl;
const containerName = config.azure.containerName;

interface AzureUploadParams {
	Key: string; // blob path (e.g., jobs/userId/file.pdf)
	Body: Buffer; // file content
	ContentType: string; // MIME type
}

/**
 * Upload one or more objects to Azure Blob Storage
 * @param objects Array of AzureUploadParams
 * @returns Array of uploaded blob paths (e.g., container/key)
 */
export const uploadToAzure = async (
	objects: AzureUploadParams[],
): Promise<string[]> => {
	const blobServiceClient =
		BlobServiceClient.fromConnectionString(storageUrl);
	const containerClient = blobServiceClient.getContainerClient(containerName);

	const uploadedKeys = await Promise.all(
		objects.map(async (obj) => {
			const blobClient: BlockBlobClient =
				containerClient.getBlockBlobClient(obj.Key);

			await blobClient.upload(obj.Body, obj.Body.length, {
				blobHTTPHeaders: {
					blobContentType: obj.ContentType,
				},
			});

			return `/${containerName}/${obj.Key}`;
		}),
	);

	return uploadedKeys;
};
