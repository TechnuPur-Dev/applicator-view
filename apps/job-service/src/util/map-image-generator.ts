import StaticMaps from 'staticmaps';

interface Coord {
	lat: number;
	lon: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const generateMapImage = async (geojson: any): Promise<Buffer> => {
	const map = new StaticMaps({ width: 800, height: 600 });

	const features = geojson?.features;
	if (!features || features.length === 0) {
		throw new Error('No features found in GeoJSON');
	}

	const drawLines = (coords: number[][]) => {
		const formattedCoords: Coord[] = coords.map(([lng, lat]) => ({
			lat,
			lon: lng,
		}));
		map.addLine({
			coords: formattedCoords,
			color: '#008000',
			width: 3,
		});
	};

	for (const feature of features) {
		if (feature.geometry.type === 'LineString') {
			drawLines(feature.geometry.coordinates);
		} else if (feature.geometry.type === 'MultiLineString') {
			for (const line of feature.geometry.coordinates) {
				drawLines(line);
			}
		} else if (feature.geometry.type === 'Polygon') {
			// Use only the outer ring
			drawLines(feature.geometry.coordinates[0]);
		}
	}

	await map.render();
	return map.image.buffer('image/png');
};
