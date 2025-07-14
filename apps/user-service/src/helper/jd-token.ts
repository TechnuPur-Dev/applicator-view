import axios from 'axios';
import config from '../config/env-config';
import { prisma } from '../../../../shared/libs/prisma-client';
import { ConnectedAccount } from '@prisma/client';
export async function getValidAccessToken(account: ConnectedAccount) {
	if (new Date() < account.expiresAt) return account.accessToken;

	const response = await axios.post(
		'https://signin.johndeere.com/oauth2/aus78tnlaysMraFhC1t7/v1/token',
		new URLSearchParams({
			grant_type: 'refresh_token',
			refresh_token: account.refreshToken,
		}),
		{
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				Authorization: `Basic ${config.johnDeere.jdAuthHeader}`, // base64(client_id:client_secret)
			},
		},
	);

	const { access_token, refresh_token, expires_in } = response.data;

	await prisma.connectedAccount.update({
		where: { id: account.id },
		data: {
			accessToken: access_token,
			refreshToken: refresh_token,
			expiresAt: new Date(Date.now() + expires_in * 1000),
		},
	});

	return access_token;
}
