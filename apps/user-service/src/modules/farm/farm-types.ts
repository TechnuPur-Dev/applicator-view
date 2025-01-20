interface CreateFarmParams {
	name: string;
	state: string;
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
