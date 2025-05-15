declare module 'staticmaps' {
	type Coord = { lon: number; lat: number } | [number, number];

	interface LineOptions {
		coords: Coord[];
		color?: string;
		width?: number;
	}

	interface MarkerOptions {
		coord: [number, number]; // [lon, lat]
		color?: string;
		size?: number;
		img?: string; // Path to marker image
		offsetX?: number;
		offsetY?: number;
		width?: number;
		height?: number;
	}

	interface PolygonOptions {
		coords: Coord[];
		color?: string;
		width?: number;
		fill?: string;
	}

	interface TextOptions {
		coord: [number, number];
		text: string;
		size?: number;
		color?: string;
		background?: string;
		offsetX?: number;
		offsetY?: number;
	}

	interface StaticMapOptions {
		width: number;
		height: number;
		tileUrl?: string;
		tileRequestTimeout?: number;
		tileRequestHeader?: Record<string, string>;
	}

	export default class StaticMaps {
		constructor(options: StaticMapOptions);

		render(center?: [number, number], zoom?: number): Promise<void>;

		addLine(options: LineOptions): void;
		addMarker(options: MarkerOptions): void;
		addPolygon(options: PolygonOptions): void;
		// addText(options: TextOptions): void;

		// setTileUrl(url: string): void;

		image: {
			buffer(mimeType: string): Buffer;
			save(filePath: string): Promise<void>;
		};
	}
}
