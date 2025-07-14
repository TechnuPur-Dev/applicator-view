import { BlobServiceClient } from '@azure/storage-blob';
import config from '../../../../shared/config/env-config';

export const uploadToAzureBlob = async (
	buffer: Buffer,
	blobName: string,
): Promise<string> => {
	const storageUrl = config.azure.storageUrl;
	const containerName = config.azure.containerName;
	const blobService = BlobServiceClient.fromConnectionString(storageUrl);
	const containerClient = blobService.getContainerClient(containerName);
	const blockBlob = containerClient.getBlockBlobClient(blobName);

	await blockBlob.uploadData(buffer, {
		blobHTTPHeaders: { blobContentType: 'image/png' },
	});
	return `/${containerName}/${blobName}`;
};
