import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { GOOGLE_CLOUD_CREDENTIALS } from '../constants';

export const initializeFirebaseAdmin = (): void => {
	if (getApps().length === 0) {
		initializeApp({
			credential: cert(GOOGLE_CLOUD_CREDENTIALS),
		});
	}
};
