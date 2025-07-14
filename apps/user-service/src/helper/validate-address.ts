import axios from 'axios';
import httpStatus from 'http-status';
import ApiError from '../../../../shared/utils/api-error';
import config from '../config/env-config';

const AUTH_ID = config.smarty.smartyAuthId;
const AUTH_TOKEN = config.smarty.smartyAuthToken;

const smartyReasonMessages: Record<string, string> = {
	blank: 'You must provide a ZIP Code and/or city/state combination.',
	invalid_state: 'Invalid state name or abbreviation.',
	invalid_city:
		'The provided township is not recognized within the selected state.',
	invalid_zipcode: 'Invalid ZIP Code.',
	conflict: 'Conflicting ZIP Code, city, or state information.',
};

interface AddressParams {
	street?: string;
	city?: string;
	state?: string;
	zipCode?: string;
}

const validateAddressHelper = async ({
	street,
	city,
	state,
	zipCode,
}: AddressParams) => {
	// Step 1: Validate by ZIP Code (if provided)
	if (zipCode && !city && !state) {
		const zipUrl = `https://us-zipcode.api.smarty.com/lookup?auth-id=${AUTH_ID}&auth-token=${AUTH_TOKEN}&zipcode=${encodeURIComponent(zipCode)}`;

		console.log(zipUrl);
		const zipResponse = await axios.get(zipUrl);

		const status = zipResponse.data?.[0]?.status;
		const reason = zipResponse.data?.[0]?.reason;

		if (status && reason) {
			const userMessage =
				smartyReasonMessages[reason] || 'Invalid ZIP Code.';
			throw new ApiError(httpStatus.BAD_REQUEST, userMessage);
		}

		return {
			message: 'Valid ZIP Code.',
			cityName:
				zipResponse.data?.[0]?.city_states?.[0]?.city ?? undefined,
		};
	}

	// Step 2: Validate City + State
	if (!street && city && state) {
		console.log(street, city, state);
		const cityStateUrl = `https://us-zipcode.api.smarty.com/lookup?auth-id=${AUTH_ID}&auth-token=${AUTH_TOKEN}&city=${encodeURIComponent(city)}&state=${encodeURIComponent(state)}`;
		const cityStateResponse = await axios.get(cityStateUrl);

		const status = cityStateResponse.data?.[0]?.status;
		const reason = cityStateResponse.data?.[0]?.reason;

		if (status && reason) {
			const userMessage =
				smartyReasonMessages[reason] ||
				'Invalid city/state combination.';
			throw new ApiError(httpStatus.BAD_REQUEST, userMessage);
		}
		return { message: 'Valid full address.' };
	}

	// Step 3: Validate Full Address
	if (street && city && state) {
		const streetUrl = `https://us-street.api.smarty.com/street-address?auth-id=${AUTH_ID}&auth-token=${AUTH_TOKEN}&street=${encodeURIComponent(street)}&city=${encodeURIComponent(city)}&state=${encodeURIComponent(state)}`;
		const streetResponse = await axios.get(streetUrl);

		if (!streetResponse.data || streetResponse.data.length === 0) {
			throw new ApiError(httpStatus.NOT_FOUND, 'Invalid street address.');
		}

		return streetResponse.data[0];
	}

	throw new ApiError(
		httpStatus.BAD_REQUEST,
		'Please provide a valid combination of ZIP Code or city/state.',
	);
};

export default validateAddressHelper;
