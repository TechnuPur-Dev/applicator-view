import bcrypt from 'bcrypt';

// Function to hash a password
export async function hashPassword(password: string): Promise<string> {
	const saltRounds = 10; // The cost factor, controls the complexity of the hashing
	try {
		const salt = await bcrypt.genSalt(saltRounds);
		const hashedPassword = await bcrypt.hash(password, salt);
		return hashedPassword;
	} catch (err) {
		console.error('Error hashing password:', err);
		throw err;
	}
}

// Function to compare password
export async function comparePassword(
	plainPassword: string,
	hashedPassword: string,
): Promise<boolean> {
	try {
		const match = await bcrypt.compare(plainPassword, hashedPassword);
		return match;
	} catch (err) {
		console.error('Error comparing password:', err);
		throw err;
	}
}
