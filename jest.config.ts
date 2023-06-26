import type { Config } from '@jest/types';
export default async (): Promise<Config.InitialOptions> => ({
    verbose: true,
    modulePathIgnorePatterns: ['<rootDir>/dist/'],
    testEnvironment: 'node',
    coverageReporters: ['json-summary', 'lcov', 'text', 'text-summary'],
    displayName: {
        name: 'xslt-transform',
        color: 'greenBright'
    },
    detectOpenHandles: true,
    transform: {
        '\\.[jt]sx?$': 'babel-jest'
    }
});
