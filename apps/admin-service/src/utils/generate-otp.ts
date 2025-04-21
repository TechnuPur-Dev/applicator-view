function generateOTP() {
	const min = 100000;
	const max = 999999;

	const otp = Math.floor(Math.random() * (max - min + 1)) + min;

	const expiryTime = new Date();
	expiryTime.setMinutes(expiryTime.getMinutes() + 60); // Set expiry time to 60 minutes

	return { otp, expiryTime };
}

export { generateOTP };
