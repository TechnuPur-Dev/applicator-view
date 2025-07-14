import config from '../../shared/config/env-config';
import { uploadToAzure } from './azure-blob-storage';
import { uploadToS3 } from './s3-storage';

interface UploadParams {
	Key: string;
	Body: Buffer;
	ContentType: string;
}

type UploadFunction = (objects: UploadParams[]) => Promise<string[]>;

export const getUploader = (): UploadFunction => {
	console.log('Storage Provider', config.storageProvider);

	switch (config.storageProvider) {
		case 's3':
			return uploadToS3;
		case 'azure':
			return uploadToAzure;
		default:
			throw new Error(
				`Unsupported storage provider: ${config.storageProvider}`,
			);
	}
};
