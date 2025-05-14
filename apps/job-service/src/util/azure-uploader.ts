import { BlobServiceClient } from '@azure/storage-blob';
import config from '../../../../shared/config/env-config';

export const uploadToAzureBlob = async (
	buffer: Buffer,
	blobPath: string,
): Promise<string> => {
	const blobService = BlobServiceClient.fromConnectionString(
		config.azureStorageUrl,
	);
	const containerClient = blobService.getContainerClient(
		config.azureContainerName,
	);
	const blockBlob = containerClient.getBlockBlobClient(blobPath);

	await blockBlob.uploadData(buffer, {
		blobHTTPHeaders: { blobContentType: 'image/png' },
	});
	return blockBlob.url;
};
