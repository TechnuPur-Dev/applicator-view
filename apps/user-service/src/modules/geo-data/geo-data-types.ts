interface StateData {
	name: string;
}
interface CountyData {
	County: string;
	State: string;
}
interface TownShipData {
	Township: string;
	County: string;
}
interface ZipCodeData {
	code: string;
	townshipId?: number;
}
interface UpdateTownShipData {
	name?: string;
	countyId?: number;
}
interface UpdateCountyData {
	name?: string;
	stateId?: number;
}
export { StateData, CountyData, TownShipData, ZipCodeData,UpdateCountyData,UpdateTownShipData };
