/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
// import { Prisma } from '@prisma/client';
import ApiError from '../../../../../shared/utils/api-error';
import { prisma } from '../../../../../shared/libs/prisma-client';
import axios from 'axios';
import config from '../../config/env-config';
import { getValidAccessToken } from '../../helper/jd-token';
import { Decimal } from '@prisma/client/runtime/library';

const getAuthUrl = async () => {
	const clientId = config.jdClientId;
	const redirectUri = config.jdRedirectUri;
	const scope = config.jdScope;
	const state = config.jdStateString;

	const authUrl = `https://signin.johndeere.com/oauth2/aus78tnlaysMraFhC1t7/v1/authorize?scope=${scope}&response_type=code&client_id=${clientId}&state=${state}&redirect_uri=${redirectUri}`;
	return { authUrl };
};

const getAuthTokens = async (userId: number, code: string) => {
	const response = await axios.post(
		'https://signin.johndeere.com/oauth2/aus78tnlaysMraFhC1t7/v1/token',
		new URLSearchParams({
			grant_type: 'authorization_code',
			code,
			redirect_uri: config.jdRedirectUri,
		}),
		{
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				Authorization: `Basic ${config.jdAuthHeader}`, // base64(client_id:client_secret)
			},
		},
	);

	const { access_token, refresh_token, expires_in } = response.data;
	const connection = await prisma.connectedAccount.findFirst({
		where: {
			userId,
			provider: 'john_deere',
		},
	});
	if (connection) {
		await prisma.connectedAccount.update({
			where: {
				id: connection?.id,
			},
			data: {
				accessToken: access_token,
				refreshToken: refresh_token,
				expiresAt: new Date(Date.now() + expires_in * 1000),
			},
		});
	} else {
		await prisma.connectedAccount.create({
			data: {
				userId,
				provider: 'john_deere',
				accessToken: access_token,
				refreshToken: refresh_token,
				expiresAt: new Date(Date.now() + expires_in * 1000),
			},
		});
	}

	return response.data;
};

const getOrganizations = async (
	userId: number,
): Promise<
	{
		id: string;
		name: string;
		type: string;
		isAuthorized: boolean;
	}[]
> => {
	const connectedAccount = await prisma.connectedAccount.findFirst({
		where: { userId, provider: 'john_deere' },
	});

	if (!connectedAccount) {
		throw new ApiError(
			httpStatus.UNAUTHORIZED,
			'Not connected to John Deere Operations Center',
		);
	}

	const accessToken = await getValidAccessToken(connectedAccount);

	const response = await axios.get(`${config.jdAPIUrl}/organizations`, {
		headers: {
			Authorization: `Bearer ${accessToken}`,
			Accept: 'application/vnd.deere.axiom.v3+json',
		},
	});

	const orgs = response.data?.values || [];

	return orgs.map((org: any) => {
		const connectionLink = org.links?.find(
			(link: any) => link.rel === 'connections',
		);

		const isAuthorized = !connectionLink;

		return {
			id: org.id,
			name: org.name,
			type: org.type,
			isAuthorized,
			connectionUrl: !isAuthorized ? connectionLink?.uri : undefined,
		};
	});
};

const getOrganizationById = async (
	userId: number,
	orgId: string,
): Promise<{
	id: string;
	name: string;
	type: string;
	isAuthorized: boolean;
	connectionUrl?: string;
}> => {
	const connectedAccount = await prisma.connectedAccount.findFirst({
		where: { userId, provider: 'john_deere' },
	});

	if (!connectedAccount) {
		throw new ApiError(
			httpStatus.UNAUTHORIZED,
			'Not connected to John Deere Operations Center',
		);
	}

	const accessToken = await getValidAccessToken(connectedAccount);
	const response = await axios.get(
		`${config.jdAPIUrl}/organizations/${orgId}`,
		{
			headers: {
				Authorization: `Bearer ${accessToken}`,
				Accept: 'application/vnd.deere.axiom.v3+json',
			},
		},
	);
	const org = response.data;

	const connectionLink = org.links?.find(
		(link: any) => link.rel === 'connections',
	);

	const isAuthorized = !connectionLink;

	return {
		id: org.id,
		name: org.name,
		type: org.type,
		isAuthorized,
		connectionUrl: !isAuthorized ? connectionLink?.uri : undefined,
	};
};

const getFarmsByOrgId = async (
	userId: number,
	orgId: string,
): Promise<{
	id: string;
	name: string;
	archived: boolean;
	isAuthorized: boolean;
	connectionUrl?: string;
}> => {
	const connectedAccount = await prisma.connectedAccount.findFirst({
		where: { userId, provider: 'john_deere' },
	});

	if (!connectedAccount) {
		throw new ApiError(
			httpStatus.UNAUTHORIZED,
			'Not connected to John Deere Operations Center',
		);
	}

	const accessToken = await getValidAccessToken(connectedAccount);
	const response = await axios.get(
		`${config.jdAPIUrl}/organizations/${orgId}/farms`,
		{
			headers: {
				Authorization: `Bearer ${accessToken}`,
				Accept: 'application/vnd.deere.axiom.v3+json',
			},
		},
	);
	const farms = response.data.values;

	return farms.map((farm: any) => {
		return {
			id: farm.id,
			name: farm.name,
			archived: farm.archived,
		};
	});
};

// const getFarmsByOrgId = async (
// 	userId: number,
// 	orgId: string,
// ): Promise<any> => {
// 	const connectedAccount = await prisma.connectedAccount.findFirst({
// 		where: { userId, provider: 'john_deere' },
// 	});

// 	if (!connectedAccount) {
// 		throw new ApiError(
// 			httpStatus.UNAUTHORIZED,
// 			'Not connected to John Deere Operations Center',
// 		);
// 	}

// 	const accessToken = await getValidAccessToken(connectedAccount);

// 	// Fetch farms
// 	const response = await axios.get(
// 		`${config.jdAPIUrl}/organizations/${orgId}/farms`,
// 		{
// 			headers: {
// 				Authorization: `Bearer ${accessToken}`,
// 				Accept: 'application/vnd.deere.axiom.v3+json',
// 			},
// 		},
// 	);

// 	const farms = response.data.values;

// 	const result = await Promise.all(
// 		farms.map(async (farm: any) => {
// 			const farmId = farm.id;

// 			// Fetch fields for this farm
// 			const fieldsResponse = await axios.get(
// 				`${config.jdAPIUrl}/organizations/${orgId}/farms/${farmId}/fields`,
// 				{
// 					headers: {
// 						Authorization: `Bearer ${accessToken}`,
// 						Accept: 'application/vnd.deere.axiom.v3+json',
// 					},
// 				},
// 			);

// 			const jdFields = fieldsResponse.data.values || [];

// 			// For each field, fetch boundary config
// 			const fieldsWithBoundaries = await Promise.all(
// 				jdFields.map(async (field: any) => {
// 					let boundaryConfig = null;

// 					try {
// 						const boundaryResponse = await axios.get(
// 							`${config.jdAPIUrl}/organizations/${orgId}/fields/${field.id}/boundaries`,
// 							{
// 								headers: {
// 									Authorization: `Bearer ${accessToken}`,
// 									Accept: 'application/vnd.deere.axiom.v3+json',
// 								},
// 							},
// 						);

// 						// Pick first boundary config if available
// 						boundaryConfig = boundaryResponse?.data?.values?.[0] || null;
// 					} catch (err: any) {
// 						console.warn(`Boundary fetch failed for field ${field.id}`, err.message);
// 					}
// 					return {
// 						id: field.id,
// 						name: field.name,
// 						crop:'',
// 						acres: boundaryConfig?.area?.unit === "ha"// Formula:1 hectare = 2.47105 acres
// 							? parseFloat(((boundaryConfig?.area?.valueAsDouble || 0) * 2.47105).toFixed(4))
// 							: parseFloat(field.acres || '0'),
// 						config: boundaryConfig, // Embed full boundary config here
// 					};
// 				}),
// 			);

// 			const totalAcres = fieldsWithBoundaries.reduce(
// 				(sum: any, field: any) => sum.plus(new Decimal(field.acres || 0)),
// 				new Decimal(0),
// 			);

// 			return {
// 				id: parseInt(farmId),
// 				name: farm.name || '',
// 				createdById: userId,
// 				growerId: userId,
// 				county: null,
// 				township: null,
// 				zipCode: null,
// 				isActive: !farm.archived,
// 				createdAt: new Date(),
// 				updatedAt: new Date(),
// 				config: {},
// 				farmImageUrl: '',
// 				stateId: 0,
// 				fields: fieldsWithBoundaries,
// 				totalAcres: totalAcres.toFixed(2),
// 			};
// 		}),
// 	);

// 	return { result };
// };

const getOrgFarmById = async (
	userId: number,
	orgId: string,
	farmId: string,
): Promise<{
	id: string;
	name: string;
	archived: boolean;
}> => {
	const connectedAccount = await prisma.connectedAccount.findFirst({
		where: { userId, provider: 'john_deere' },
	});

	if (!connectedAccount) {
		throw new ApiError(
			httpStatus.UNAUTHORIZED,
			'Not connected to John Deere Operations Center',
		);
	}

	const accessToken = await getValidAccessToken(connectedAccount);

	const response = await axios.get(
		`${config.jdAPIUrl}/organizations/${orgId}/farms/${farmId}`,
		{
			headers: {
				Authorization: `Bearer ${accessToken}`,
				Accept: 'application/vnd.deere.axiom.v3+json',
			},
		},
	);
	const farm = response.data;

	return {
		id: farm.id,
		name: farm.name,
		archived: farm.archived,
	};
};

const getFieldsByFarmId = async (
	userId: number,
	orgId: string,
	farmId: string,
): Promise<{
	id: string;
	name: string;
	archived: boolean;
}> => {
	const connectedAccount = await prisma.connectedAccount.findFirst({
		where: { userId, provider: 'john_deere' },
	});

	if (!connectedAccount) {
		throw new ApiError(
			httpStatus.UNAUTHORIZED,
			'Not connected to John Deere Operations Center',
		);
	}

	const accessToken = await getValidAccessToken(connectedAccount);
	const response = await axios.get(
		`${config.jdAPIUrl}/organizations/${orgId}/farms/${farmId}/fields`,
		{
			headers: {
				Authorization: `Bearer ${accessToken}`,
				Accept: 'application/vnd.deere.axiom.v3+json',
			},
		},
	);
	const fields = response.data.values;
	return fields.map((fields: any) => {
		return {
			id: fields.id,
			name: fields.name,
			archived: fields.archived,
		};
	});
};

const getOrgFieldByFieldId = async (
	userId: number,
	orgId: string,
	fieldId: string,
): Promise<{
	id: string;
	name: string;
	archived: boolean;
}> => {
	const connectedAccount = await prisma.connectedAccount.findFirst({
		where: { userId, provider: 'john_deere' },
	});

	if (!connectedAccount) {
		throw new ApiError(
			httpStatus.UNAUTHORIZED,
			'Not connected to John Deere Operations Center',
		);
	}
	const accessToken = await getValidAccessToken(connectedAccount);
	const response = await axios.get(
		`${config.jdAPIUrl}/organizations/${orgId}/fields/${fieldId}`,
		{
			headers: {
				Authorization: `Bearer ${accessToken}`,
				Accept: 'application/vnd.deere.axiom.v3+json',
			},
		},
	);
	const fields = response.data;
	return {
		id: fields.id,
		name: fields.name,
		archived: fields.archived,
	};
};

const getBoundariesByFieldId = async (
	userId: number,
	orgId: string,
	fieldId: string,
) => {
	const connectedAccount = await prisma.connectedAccount.findFirst({
		where: { userId, provider: 'john_deere' },
	});

	if (!connectedAccount) {
		throw new ApiError(
			httpStatus.UNAUTHORIZED,
			'Not connected to John Deere Operations Center',
		);
	}

	const accessToken = await getValidAccessToken(connectedAccount);
	const response = await axios.get(
		`${config.jdAPIUrl}/organizations/${orgId}/fields/${fieldId}/boundaries`,
		{
			headers: {
				Authorization: `Bearer ${accessToken}`,
				Accept: 'application/vnd.deere.axiom.v3+json',
			},
		},
	);
	const boundaries = response.data.values;
	// return boundaries;
	return boundaries.map((bound: any) => {
		return {
			id: bound.id,
			name: bound.name,
			sourceType: bound.sourceType,
			archived: bound.archived,
			active: bound.active,
			area: bound.area,
			workableArea: bound.workableArea,
			multipolygons: bound.multipolygons,
			extent: bound.extent,
		};
	});
};

const getFieldBoundaryById = async (
	userId: number,
	orgId: string,
	fieldId: string,
	bound_Id: string,
) => {
	const connectedAccount = await prisma.connectedAccount.findFirst({
		where: { userId, provider: 'john_deere' },
	});

	if (!connectedAccount) {
		throw new ApiError(
			httpStatus.UNAUTHORIZED,
			'Not connected to John Deere Operations Center',
		);
	}
	// const orgs = await getOrganizations(userId);
	// const targetOrg = orgs.find((org) => org.id === orgId.toString());

	// if (!targetOrg) {
	// 	throw new ApiError(httpStatus.NOT_FOUND, 'Organization not found');
	// }
	const accessToken = await getValidAccessToken(connectedAccount);
	const response = await axios.get(
		`${config.jdAPIUrl}/organizations/${orgId}/fields/${fieldId}/boundaries/${bound_Id}`,
		{
			headers: {
				Authorization: `Bearer ${accessToken}`,
				Accept: 'application/vnd.deere.axiom.v3+json',
			},
		},
	);
	const bound = response.data;
	// return boundaries;
	return {
		id: bound.id,
		name: bound.name,
		sourceType: bound.sourceType,
		archived: bound.archived,
		active: bound.active,
		area: bound.area,
		workableArea: bound.workableArea,
		multipolygons: bound.multipolygons,
		extent: bound.extent,
	};
};

export default {
	getAuthUrl,
	getAuthTokens,
	getOrganizations,
	getOrganizationById,
	getFarmsByOrgId,
	getOrgFarmById,
	getFieldsByFarmId,
	getOrgFieldByFieldId,
	getBoundariesByFieldId,
	getFieldBoundaryById,
};
