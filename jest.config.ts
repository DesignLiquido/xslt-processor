import type { Config } from '@jest/types';
export default async (): Promise<Config.InitialOptions> => {
	return {
        verbose: true,
        modulePathIgnorePatterns: ['<rootDir>/dist/'],
        testEnvironment: 'node',
        coverageReporters: ['json-summary', 'lcov', 'text', 'text-summary'],
		displayName: {
			name: 'liquido',
			color: 'greenBright'
		},
		detectOpenHandles: true,
		transform: {
			"\\.[jt]sx?$": "babel-jest"
		}
    };
};
