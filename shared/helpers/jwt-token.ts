import JWT from 'jsonwebtoken';
import httpStatus from 'http-status';
import config from '../config/env-config';
import ApiError from '../utils/api-error';

/**
 * Generate a user access token.
 * @param userId - User ID.
 * @returns A promise that resolves to the signed access token.
 */
export const signAccessToken = (userId: number): Promise<string> => {
	return new Promise((resolve, reject) => {
		const payload = { id: userId };
		const options = {
			expiresIn: config.jwt.accessExpirationMinutes,
			issuer: 'acre-app',
			audience: userId.toString(),
		};

		JWT.sign(payload, config.jwt.accessSecret, options, (err, token) => {
			if (err) {
				reject(
					new ApiError(
						httpStatus.INTERNAL_SERVER_ERROR,
						'Something Went Wrong',
					),
				);
			} else {
				resolve(token as string);
			}
		});
	});
};
