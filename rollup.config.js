import commonjs from 'rollup-plugin-commonjs'
import resolve from 'rollup-plugin-node-resolve'
import buble from 'rollup-plugin-buble'
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';

export default {
    plugins: [
        typescript({
            exclude: [
                "**/__tests__",
                "**/*.test.ts",
                "jest.config.ts"
            ],
            tsconfig: './tsconfig.rollup.json'
        }),
        commonjs(),
        resolve(),
        buble({
          transforms: {dangerousForOf: true}
        }),
        terser()
    ],
    output: {
        format: 'umd',
        name: 'XsltProcessor',
        sourcemap: true
    }
}
