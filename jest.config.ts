import type { Config } from '@jest/types';
export default async (): Promise<Config.InitialOptions> => ({
    verbose: true,
    modulePathIgnorePatterns: [
        '<rootDir>/dist/'
    ],
    testPathIgnorePatterns: [
        '<rootDir>/node_modules/',
        '<rootDir>/src/xpath/lib/'
    ],
    maxWorkers: '50%',
    testEnvironment: 'node',
    coverageReporters: ['json-summary', 'lcov', 'text', 'text-summary'],
    displayName: {
        name: 'xslt-transform',
        color: 'greenBright'
    },
    detectOpenHandles: true,
    preset: 'ts-jest',
    transform: {
        '^.+\\.(ts|tsx)?$': ['ts-jest', {
            isolatedModules: false,
            tsconfig: 'tsconfig.jest.json',
            diagnostics: {
                warnOnly: true
            }
        }],
        '^.+\\.(js|jsx)$': ['babel-jest', {
            sourceMaps: true
        }]
    }
});
