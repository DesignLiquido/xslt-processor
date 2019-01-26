import commonjs from 'rollup-plugin-commonjs'
import resolve from 'rollup-plugin-node-resolve'
import buble from 'rollup-plugin-buble'
import { terser } from 'rollup-plugin-terser'

export default {
    plugins: [
        commonjs(),
        resolve(),
        buble({
          transforms: { dangerousForOf: true }
        }),
        terser()
    ],
    output: {
        format: 'cjs'
    }
}
