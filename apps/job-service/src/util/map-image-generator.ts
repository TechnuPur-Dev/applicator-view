/* eslint-disable @typescript-eslint/no-explicit-any */
// utils/staticMapGenerator.ts
import StaticMaps from 'staticmaps';
import path from 'path';
import fs from 'fs';

const outputPath = path.resolve(__dirname, '../output/map.png');

export const generateMapImage = async (geojson: any): Promise<Buffer> => {
	const options = { width: 800, height: 600 };
	const map = new StaticMaps(options);

	const features = geojson?.features;
	if (!features || features.length === 0) {
		throw new Error('No features found in GeoJSON');
	}

	const allCoords: [number, number][] = [];

	for (const feature of features) {
		if (feature.geometry.type === 'LineString') {
			const coords = feature.geometry.coordinates;

			// Add to collection for bounds
			allCoords.push(...coords);

			const line = {
				coords: coords.map(([lon, lat]: [number, number]) => ({
					lon,
					lat,
				})),
				color: '#0000FF',
				width: 8,
			};
			// Draw route
			map.addLine(line);
		}
	}

	// Compute bounding box
	const lons = allCoords.map((c) => c[0]);
	const lats = allCoords.map((c) => c[1]);

	const minLon = Math.min(...lons);
	const maxLon = Math.max(...lons);
	const minLat = Math.min(...lats);
	const maxLat = Math.max(...lats);

	const center: [number, number] = [
		(minLon + maxLon) / 2,
		(minLat + maxLat) / 2,
	];

	await map.render(center); // Auto-zoom

	// Save to disk
	const dir = path.dirname(outputPath);
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}
	await map.image.save(outputPath);
	console.log(`Map saved to: ${outputPath}`);
	return map.image.buffer('image/png');
};
