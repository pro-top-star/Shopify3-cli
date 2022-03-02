import path from 'pathe'

import {external, plugins, distDir} from '../../configurations/rollup.config'

const hydrogenExternal = [/@miniflare/, /prettier/]
const cliExternal = ['@shopify/cli-kit', ...external, ...hydrogenExternal]

const configuration = () => [
  // CLI
  {
    input: [path.join(__dirname, 'src/index.ts')],
    output: [
      {
        dir: distDir(__dirname),
        format: 'esm',
        sourcemap: true,
      },
    ],
    plugins: plugins(__dirname),
    external: cliExternal,
  },
]

export default configuration
