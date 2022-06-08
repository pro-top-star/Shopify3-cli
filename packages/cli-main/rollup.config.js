import {fileURLToPath} from 'url'

import path from 'pathe'
import fg from 'fast-glob'

import {external, plugins, distDir} from '../../configurations/rollup.config'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const hydrogenExternal = [/@miniflare/, /prettier/]
const cliExternal = ['@shopify/cli-kit', ...external, ...hydrogenExternal]

const cliCommands = fg.sync([
  path.join(__dirname, `/src/cli-main/commands/**/*.ts`),
  `!${path.join(__dirname, `/src/cli-main/commands/**/*.test.ts`)}`,
])

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
  {
    input: [...cliCommands],
    output: [
      {
        dir: distDir(__dirname),
        format: 'esm',
        sourcemap: true,
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.facadeModuleId.includes('src/cli-main/commands')) {
            // Preserves the commands/... path
            return `commands/${chunkInfo.facadeModuleId.split('src/cli-main/commands').pop().replace('ts', 'js')}`
          } else {
            return '[name].js'
          }
        },
      },
    ],
    plugins: plugins(__dirname),
    external: cliExternal,
  },
]

export default configuration
