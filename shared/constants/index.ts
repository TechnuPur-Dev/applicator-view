import apiConfig from '../config/env-config';

export const GOOGLE_CLOUD_CREDENTIALS = JSON.parse(
  Buffer.from(apiConfig.googleCloudCredentials, 'base64').toString('utf-8')
);