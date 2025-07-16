// /* eslint-disable @typescript-eslint/no-explicit-any */
// // utils/staticMapGenerator.ts
// import StaticMaps from 'staticmaps';
// import path from 'path';
// import fs from 'fs';
// import { createCanvas } from 'canvas';

// const outputPath = path.resolve(__dirname, '../output/map.png');

// export const generateMapImage = async (geojson: any): Promise<Buffer> => {
// 	console.log(createCanvas(100, 100));
// 	const options = { width: 800, height: 600 };
// 	const map = new StaticMaps(options);

// 	const features = geojson?.features;
// 	if (!features || features.length === 0) {
// 		throw new Error('No features found in GeoJSON');
// 	}

// 	const allCoords: [number, number][] = [];

// 	for (const feature of features) {
// 		const { geometry } = feature;
// 		const { type, coordinates } = geometry;

// 		switch (type) {
// 			case 'Point': {
// 				const [lon, lat] = coordinates;
// 				allCoords.push([lon, lat]);
// 				map.addMarker({
// 					coord: [lon, lat],
// 					color: '#FF0000',
// 					size: 10,
// 				});
// 				break;
// 			}
// 			case 'MultiPoint': {
// 				for (const [lon, lat] of coordinates) {
// 					allCoords.push([lon, lat]);
// 					map.addMarker({
// 						coord: [lon, lat],
// 						color: '#FF0000',
// 						size: 10,
// 					});
// 				}
// 				break;
// 			}
// 			case 'LineString': {
// 				const coords = coordinates as [number, number][];
// 				if (coords.length < 2) break;

// 				allCoords.push(...coords);
// 				const formatted = coords.map(
// 					([lon, lat]: [number, number]) => ({ lon, lat }),
// 				);

// 				console.log('Drawing LineString:', formatted);

// 				map.addLine({
// 					coords,
// 					color: '#0000FF',
// 					width: 6,
// 				});
// 				break;
// 			}
// 			case 'MultiLineString': {
// 				for (const line of coordinates) {
// 					allCoords.push(...line);
// 					map.addLine({
// 						coords: line.map(([lon, lat]: [number, number]) => ({
// 							lon,
// 							lat,
// 						})),
// 						color: '#0000FF',
// 						width: 6,
// 					});
// 				}
// 				break;
// 			}
// 			case 'Polygon': {
// 				for (const ring of coordinates) {
// 					allCoords.push(...ring);
// 					map.addPolygon({
// 						coords: ring.map(([lon, lat]: [number, number]) => ({
// 							lon,
// 							lat,
// 						})),
// 						color: '#00FF00',
// 						width: 2,
// 						fill: '#00FF0055',
// 					});
// 				}
// 				break;
// 			}
// 			case 'MultiPolygon': {
// 				for (const polygon of coordinates) {
// 					for (const ring of polygon) {
// 						allCoords.push(...ring);
// 						map.addPolygon({
// 							coords: ring.map(
// 								([lon, lat]: [number, number]) => ({
// 									lon,
// 									lat,
// 								}),
// 							),
// 							color: '#00FF00',
// 							width: 2,
// 							fill: '#00FF0055',
// 						});
// 					}
// 				}
// 				break;
// 			}
// 			default:
// 				console.warn(`Unsupported geometry type: ${type}`);
// 		}
// 	}

// 	if (allCoords.length === 0) {
// 		throw new Error('No valid coordinates found in GeoJSON');
// 	}

// 	// Compute bounding box
// 	const lons = allCoords.map((c) => c[0]);
// 	const lats = allCoords.map((c) => c[1]);
// 	const minLon = Math.min(...lons);
// 	const maxLon = Math.max(...lons);
// 	const minLat = Math.min(...lats);
// 	const maxLat = Math.max(...lats);

// 	const center: [number, number] = [
// 		(minLon + maxLon) / 2,
// 		(minLat + maxLat) / 2,
// 	];

// 	await map.render(center); // auto-zoom by bounds

// 	// Save to disk
// 	const dir = path.dirname(outputPath);
// 	if (!fs.existsSync(dir)) {
// 		fs.mkdirSync(dir, { recursive: true });
// 	}
// 	await map.image.save(outputPath);
// 	console.log(`Map saved to: ${outputPath}`);
// 	return map.image.buffer('image/png');
// };
