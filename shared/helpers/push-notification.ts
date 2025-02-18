import { getMessaging, Message } from 'firebase-admin/messaging';
import { prisma } from '../libs/prisma-client';
import uniq from 'lodash/uniq';

interface PushNotificationParams {
	userIds: number | number[];
	title: string;
	message?: string;
	payload?: Record<string, unknown>;
	notificationType: string;
}

interface NotificationToken {
	token: string;
}

interface SingleNotificationParams {
	deviceToken: string;
	topicName?: string;
	conditionExpression?: string;
	title: string;
	message?: string;
	payload?: Record<string, unknown>;
	notificationType: string;
}

export const sendPushNotifications = async ({
	userIds,
	title,
	message,
	payload,
	notificationType,
}: PushNotificationParams): Promise<void> => {
	if (!userIds || (Array.isArray(userIds) && userIds.length === 0)) return;

	const userIdsArray = Array.isArray(userIds) ? uniq(userIds) : [userIds];

	const userTokens: NotificationToken[] = await prisma.deviceToken.findMany({
		where: { userId: { in: userIdsArray } },
		select: { token: true },
		distinct: ['token'],
	});

	if (userTokens.length === 0) return;

	await Promise.all(
		userTokens.map(({ token }) =>
			sendSingleNotification({
				deviceToken: token,
				title,
				message,
				payload,
				notificationType,
			}),
		),
	);
};

export const sendSingleNotification = async ({
	deviceToken,
	topicName,
	conditionExpression,
	title,
	message,
	payload,
	notificationType,
}: SingleNotificationParams): Promise<void> => {
	if (!deviceToken && !topicName && !conditionExpression) {
		console.error(
			'Error: At least one of deviceToken, topicName, or conditionExpression is required.',
		);
		return;
	}

	// Construct the base notification object
	const notificationMessage: Message = {
		notification: {
			title,
			body: message ?? '',
		},
		data: {
			type: notificationType,
			...(payload ? { payload: JSON.stringify(payload) } : {}),
		},
		// Spread properties only if they are defined (fixes the TypeScript error)
		token: deviceToken,
	};

	try {
		await getMessaging().send(notificationMessage);
	} catch (error) {
		console.error('Error sending notification:', error);
	}
};
