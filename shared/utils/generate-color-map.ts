const generateColorMapFromPercent = (
	data: { state: string; userPercent: number }[],
): Record<string, string> => {
	const sorted = [...data].sort((a, b) => b.userPercent - a.userPercent);
	const total = sorted.length;

	const colorMap: Record<string, string> = {};

	const minLightness = 30; // darkest gray (not black)
	const maxLightness = 85; // lightest gray (not white)

	sorted.forEach((item, index) => {
		const lightness =
			maxLightness -
			(maxLightness - minLightness) * (index / (total - 1 || 1));
		colorMap[item.state] = `hsl(0, 0%, ${lightness}%)`;
	});

	return colorMap;
};

export { generateColorMapFromPercent };
