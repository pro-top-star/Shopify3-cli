import {OutputProcess} from '../../../../output.js'
import React, {FunctionComponent, useEffect, useState} from 'react'
import {Box, Static, Text, useApp, useStdout} from 'ink'
import stripAnsi from 'strip-ansi'
import AbortController from 'abort-controller'
import {Writable} from 'node:stream'

export type WritableStream = (process: OutputProcess, index: number) => Writable
export type RunProcesses = (
  writableStream: WritableStream,
  unmountInk: (error?: Error | undefined) => void,
) => Promise<void>

interface Props {
  processes: OutputProcess[]
  abortController: AbortController
  showTimestamps?: boolean
}
interface Chunk {
  color: string
  prefix: string
  lines: string[]
}

const TIMESTAMP_COLUMN_WIDTH = 19
const OUTPUT_MIN_WIDTH = 80

function chunkString(str: string, length: number) {
  if (str.length <= length) {
    return [str]
  }

  const numChunks = Math.ceil(str.length / length)
  const chunks: string[] = new Array(numChunks)

  for (let i = 0, start = 0; i < numChunks; i++, start += length) {
    chunks[i] = str.slice(start, start + length)
  }

  return chunks
}

/**
 * Renders output from concurrent processes to the terminal.
 * Output will be divided in a three column layout
 * with the left column containing the timestamp,
 * the right column containing the output,
 * and the middle column containing the process prefix.
 * Every process will be rendered with a different color, up to 4 colors.
 *
 * For example running `shopify app dev`:
 *
 * ```shell
 * 2022-10-10 13:11:03 | backend    | npm
 * 2022-10-10 13:11:03 | backend    |  WARN ignoring workspace config at ...
 * 2022-10-10 13:11:03 | backend    |
 * 2022-10-10 13:11:03 | backend    |
 * 2022-10-10 13:11:03 | backend    | > shopify-app-template-node@0.1.0 dev
 * 2022-10-10 13:11:03 | backend    | > cross-env NODE_ENV=development nodemon backend/index.js --watch ./backend
 * 2022-10-10 13:11:03 | backend    |
 * 2022-10-10 13:11:03 | backend    |
 * 2022-10-10 13:11:03 | frontend   |
 * 2022-10-10 13:11:03 | frontend   | > starter-react-frontend-app@0.1.0 dev
 * 2022-10-10 13:11:03 | frontend   | > cross-env NODE_ENV=development node vite-server.js
 * 2022-10-10 13:11:03 | frontend   |
 * 2022-10-10 13:11:03 | frontend   |
 * 2022-10-10 13:11:03 | backend    | [nodemon] 2.0.19
 * 2022-10-10 13:11:03 | backend    |
 * 2022-10-10 13:11:03 | backend    | [nodemon] to restart at any time, enter `rs`
 * 2022-10-10 13:11:03 | backend    | [nodemon] watching path(s): backend/
 * 2022-10-10 13:11:03 | backend    | [nodemon] watching extensions: js,mjs,json
 * 2022-10-10 13:11:03 | backend    | [nodemon] starting `node backend/index.js`
 * 2022-10-10 13:11:03 | backend    |
 *
 * ```
 */
const ConcurrentOutput: FunctionComponent<Props> = ({processes, abortController, showTimestamps = true}) => {
  const [processOutput, setProcessOutput] = useState<Chunk[]>([])
  const concurrentColors = ['yellow', 'cyan', 'magenta', 'green', 'blue']
  const prefixColumnSize = Math.max(...processes.map((process) => process.prefix.length))
  const {exit: unmountInk} = useApp()
  const {stdout} = useStdout()
  const fullWidth = stdout?.columns ?? OUTPUT_MIN_WIDTH

  function lineColor(index: number) {
    const colorIndex = index < concurrentColors.length ? index : index % concurrentColors.length
    return concurrentColors[colorIndex]!
  }

  const writableStream = (process: OutputProcess, index: number) => {
    return new Writable({
      write(chunk, _encoding, next) {
        const lines = stripAnsi(chunk.toString('ascii')).split(/\n/)

        setProcessOutput((previousProcessOutput) => [
          ...previousProcessOutput,
          {
            color: lineColor(index),
            prefix: process.prefix,
            lines,
          },
        ])

        next()
      },
    })
  }

  const runProcesses = async () => {
    try {
      await Promise.all(
        processes.map(async (process, index) => {
          const stdout = writableStream(process, index)
          const stderr = writableStream(process, index)

          await process.action(stdout, stderr, abortController.signal)
        }),
      )

      unmountInk()
    } catch (error) {
      abortController.abort()
      unmountInk()
      throw error
    }
  }

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    runProcesses()
  }, [])

  return (
    <Static items={processOutput}>
      {(chunk, index) => {
        // -1 for the paddingLeft of the line column
        // -1 for the gutter width
        // -2 for the marginX of the prefix one
        let lineColumnWidth = fullWidth - prefixColumnSize - 1 - 1 - 2

        if (showTimestamps) {
          // -1 for the marginRight of the timestamp column
          // -1 for the gutter width
          lineColumnWidth -= TIMESTAMP_COLUMN_WIDTH - 1 - 1
        }

        const chunkedLines = chunk.lines.map((line) => {
          return chunkString(line, lineColumnWidth)
        })

        return (
          <Box flexDirection="column" key={index}>
            {chunkedLines.map((lines, index) =>
              lines.map((line, lineIndex) => (
                <Box key={`${index}:${lineIndex}`} flexDirection="row">
                  {showTimestamps && (
                    <Box>
                      <Box width={TIMESTAMP_COLUMN_WIDTH} marginRight={1}>
                        {lineIndex === 0 && (
                          <Text color={chunk.color}>
                            {new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')}
                          </Text>
                        )}
                      </Box>

                      <Text bold color={chunk.color}>
                        |
                      </Text>
                    </Box>
                  )}

                  <Box width={prefixColumnSize} marginX={1}>
                    {lineIndex === 0 && <Text color={chunk.color}>{chunk.prefix}</Text>}
                  </Box>

                  <Text bold color={chunk.color}>
                    |
                  </Text>

                  <Box paddingLeft={1}>
                    <Text color={chunk.color}>{line}</Text>
                  </Box>
                </Box>
              )),
            )}
          </Box>
        )
      }}
    </Static>
  )
}

export default ConcurrentOutput
