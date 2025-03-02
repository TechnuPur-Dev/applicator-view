import jwt from 'jsonwebtoken';
import config from '../config/env-config';

const generateInviteToken = (role: string) => {
	const payload = { role };
	return jwt.sign(payload, config.jwt.accessSecret, { expiresIn: '7d' });
};

const verifyInvite = (token: string): string | null => {
	try {
		// Decode and verify the token
		const decoded = jwt.verify(token, config.jwt.accessSecret) as {
			role: string;
		};

		// Return the role if exists
		return decoded.role || null;
	} catch (error) {
		console.error('Invalid or expired token:', error);
		return null;
	}
};

export { generateInviteToken, verifyInvite };
