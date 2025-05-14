import { DOMParser } from 'xmldom';
import toGeoJSON from '@tmcw/togeojson';

/**
 * Converts a KML file buffer to GeoJSON.
 * @param fileBuffer - The buffer of the uploaded KML file.
 * @returns GeoJSON object
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const convertKmlToGeoJson = async (fileBuffer: Buffer): Promise<any> => {
	const kmlString = fileBuffer.toString('utf8');
	const kml = new DOMParser().parseFromString(kmlString);
	return toGeoJSON.kml(kml);
};
