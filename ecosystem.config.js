export default {
	apps: [
		{
			name: 'user-service',
			script: './apps/user-service/index.js', // or dist/main.js
		},
		{
			name: 'job-service',
			script: './apps/job-service/index.js',
		},
		{
			name: 'grower-service',
			script: './apps/grower-service/index.js',
		},
	],
};
