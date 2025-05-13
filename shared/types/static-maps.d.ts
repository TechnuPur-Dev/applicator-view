declare module 'staticmaps' {
	export default class StaticMaps {
		constructor(options: { width: number; height: number });
		addLine(options: {
			coords: { lat: number; lon: number }[];
			color?: string;
			width?: number;
		}): void;
		render(): Promise<void>;
		image: {
			buffer(mime: string): Buffer;
		};
	}
}
