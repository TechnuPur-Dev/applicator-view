import { ActivityAction } from '@prisma/client';
import { EntityType } from '../../../../shared/constants'; // Make sure this is a TypeScript enum
import { prisma } from '../../../../shared/libs/prisma-client';

interface LogActivityParams {
	adminId: number;
	action: ActivityAction;
	entityType: EntityType;
	entityId?: number;
	details?: string;
}

const logActivity = async ({
	adminId,
	action,
	entityType,
	entityId,
	details,
}: LogActivityParams) => {
	// Validate adminId
	if (!Number.isInteger(adminId) || adminId <= 0) {
		throw new Error('Invalid adminId provided for activity log.');
	}

	// Validate action
	if (!Object.values(ActivityAction).includes(action)) {
		throw new Error(`Invalid action: ${action}`);
	}

	// Validate entityType
	if (!Object.values(EntityType).includes(entityType)) {
		throw new Error(`Invalid entityType: ${entityType}`);
	}

	// Validate entityId if provided
	if (
		entityId !== undefined &&
		(!Number.isInteger(entityId) || entityId <= 0)
	) {
		throw new Error('Invalid entityId provided for activity log.');
	}

	// Validate details if provided
	if (details !== undefined && typeof details !== 'string') {
		throw new Error('Details must be a string if provided.');
	}

	// Create log
	await prisma.activityLog.create({
		data: {
			adminId,
			action,
			entityType,
			entityId,
			details,
		},
	});
};

export default logActivity;
