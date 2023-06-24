import commonjs from 'rollup-plugin-commonjs'
import resolve from 'rollup-plugin-node-resolve'
import buble from 'rollup-plugin-buble'
import {terser} from 'rollup-plugin-terser'
import typescript from '@rollup/plugin-typescript';

export default {
    plugins: [
        typescript(),
        commonjs(),
        resolve(),
        buble({
          transforms: {dangerousForOf: true}
        }),
        terser()
    ],
    output: {
        format: 'cjs',
        sourcemap: true
    }
}
