import esbuild from 'rollup-plugin-esbuild';
import resolve from '@rollup/plugin-node-resolve';
import json from '@rollup/plugin-json';
import path from 'pathe';
import stripShebang from 'rollup-plugin-strip-shebang';
import commonjs from '@rollup/plugin-commonjs';
import externals from 'rollup-plugin-node-externals';

export const distDir = (packagePath) => {
  return process.env.SHOPIFY_DIST_DIR || path.join(packagePath, 'dist');
};

export const plugins = (packagePath) => {
  return [
    stripShebang(),
    resolve({
      preferBuiltins: true,
      moduleDirectories: [
        path.join(packagePath, 'node_modules'),
        path.join(packagePath, '../../node_modules'),
      ],
    }),
    esbuild({
      target: 'ES2020',
      tsconfig: path.join(packagePath, 'tsconfig.dist.json'),
    }),
    json(),
    commonjs({
      include: /node_modules/,
    }),
    externals({
      prefixedBuiltins: true,
    }),
  ];
};

export const external = ['readable-stream', 'chalk', 'glob'];

const configuration = () => [
  // create-app
  {
    input: path.join(__dirname, 'src/index.ts'),
    output: [
      {
        file: path.join(distDir, 'index.js'),
        format: 'esm',
        exports: 'auto',
      },
    ],
    plugins,
    external: [...external],
  },
];

export default configuration;
