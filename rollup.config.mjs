import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

export default {
  input: 'dist/index.js',
  plugins: [
    nodeResolve(),
    commonjs(),
  ],
  output: [
    {
      file: 'dist/index.mjs',
      format: 'es',
    },
    {
      file: 'dist/index.umd.js',
      name: 'RpgTs',
      format: 'umd',
    },
    {
      file: 'dist/index.umd.min.js',
      name: 'RpgTs',
      format: 'umd',
      plugins: [terser()],
    },
  ],
};
