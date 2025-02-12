interface StateData {
	name: string;
}
interface CountyData {
	name: string;
	stateId: number;
}
interface TownShipData {
	name: string;
	countyId: number;
}
interface ZipCodeData {
	code: string;
	townshipId?: number;
}

export { StateData, CountyData, TownShipData, ZipCodeData };
