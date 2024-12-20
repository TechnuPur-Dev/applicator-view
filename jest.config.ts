import type { Config } from 'jest';

const config: Config = {
	preset: 'ts-jest',
	roots: ['./tests'],
	coveragePathIgnorePatterns: ['/node_modules/', '/tests/'],
	collectCoverage: true,
	coverageDirectory: './coverage', // Explicitly define the coverage output folder
	collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts', '!src/**/index.ts'], // Control coverage collection
	testEnvironment: 'node',
	testMatch: ['**/?(*.)+(spec|test).ts'], // Define test file pattern
	reporters: [
		'default',
		[
			'jest-to-sonar',
			{
				outputFile: './coverage/sonar-report.xml',
			},
		],
	],
	setupFiles: ['dotenv/config'],
	maxWorkers: '50%', // Optionally control the number of workers
	verbose: true, // Enable detailed test output (optional)
};

export default config;
