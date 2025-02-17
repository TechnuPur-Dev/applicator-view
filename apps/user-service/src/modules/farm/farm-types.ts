interface CreateFarmParams {
	name: string;
	stateId: number;
	county: string;
	township: string;
	zipCode: string;
	isActive: boolean;
}

interface AssignFarmPermission {
	farmId: number;
	applicatorId: number;
	canView: boolean;
	canEdit: boolean;
}

export { CreateFarmParams, AssignFarmPermission };
