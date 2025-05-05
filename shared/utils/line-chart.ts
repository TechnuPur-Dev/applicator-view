function calculateMaxY(values: number[]) {
	const max = Math.max(...values);
	if (max === 0) return 10;
	const magnitude = Math.pow(10, Math.floor(Math.log10(max)));
	return Math.ceil(max / magnitude) * magnitude;
}

function calculateInterval(values: number[]) {
	const max = Math.max(...values);
	if (max === 0) return 2;
	const steps = 5;
	return Math.ceil(max / steps);
}

export { calculateMaxY, calculateInterval };
