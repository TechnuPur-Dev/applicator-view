import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import config from '../../shared/config/env-config';

const s3 = new S3Client({
	region: config.aws.region,
	credentials: {
		accessKeyId: config.aws.accessKeyId,
		secretAccessKey: config.aws.secretAccessKey,
	},
});

interface S3UploadParams {
	Key: string; // S3 object key (path/filename)
	Body: Buffer; // file content
	ContentType: string; // MIME type
}

/**
 * Upload one or more objects to S3
 * @param objects Array of S3UploadParams
 * @returns Array of uploaded object keys (S3 paths)
 */
export const uploadToS3 = async (
	objects: S3UploadParams[],
): Promise<string[]> => {
	const uploadedKeys = await Promise.all(
		objects.map(async (obj) => {
			await s3.send(
				new PutObjectCommand({
					Bucket: config.aws.s3Bucket,
					Key: obj.Key,
					Body: obj.Body,
					ContentType: obj.ContentType,
				}),
			);
			return `/${obj.Key}`;
		}),
	);

	return uploadedKeys;
};
