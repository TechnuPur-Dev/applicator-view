/* eslint-disable no-undef */
module.exports = {
	apps: [
		{
			name: 'user-service',
			script: 'node_modules/.bin/ts-node',
			args: 'apps/user-service/index.ts',
			cwd: '.', // root of the monorepo
			interpreter: 'none',
			env: {
				NODE_ENV: 'production',
				PORT: 3000,
			},
		},
		{
			name: 'job-service',
			script: 'node_modules/.bin/ts-node',
			args: 'apps/job-service/index.ts',
			cwd: '.',
			interpreter: 'none',
			env: {
				NODE_ENV: 'production',
				PORT: 3001,
			},
		},
		{
			name: 'admin-service',
			script: 'node_modules/.bin/ts-node',
			args: 'apps/admin-service/index.ts',
			cwd: '.',
			interpreter: 'none',
			env: {
				NODE_ENV: 'production',
				PORT: 3002,
			},
		},
	],
};
