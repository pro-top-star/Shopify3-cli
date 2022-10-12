import {Banner} from './Banner.js'
import {List} from './List.js'
import {Bug, cleanSingleStackTracePath, Fatal} from '../../../../error.js'
import {colors} from '../../../../node/colors.js'
import {Box, Text} from 'ink'
import React from 'react'
import StackTracey from 'stacktracey'

export interface FatalErrorProps {
  error: Fatal
}

const FatalError: React.FC<FatalErrorProps> = ({error}) => {
  let stack

  if (error instanceof Bug) {
    stack = new StackTracey(error)
    stack.items.forEach((item) => {
      item.file = cleanSingleStackTracePath(item.file)
    })

    stack = stack.withSources()
    stack = stack
      .filter((entry) => {
        return !entry.file.includes('@oclif/core')
      })
      .map((item) => {
        item.calleeShort = colors.yellow(item.calleeShort)
        /** We make the paths relative to the packages/ directory */
        const fileShortComponents = item.fileShort.split('packages/')
        item.fileShort = fileShortComponents.length === 2 ? fileShortComponents[1]! : fileShortComponents[0]!
        return item
      })
  }

  return (
    <Banner type="error">
      <Box>
        <Text>{error.message}</Text>
      </Box>

      {error.tryMessage && (
        <Box marginTop={1}>
          <List title="What to try" items={[error.tryMessage]} />
        </Box>
      )}
      {stack && stack.items.length !== 0 && (
        <Box marginTop={1} flexDirection="column">
          <Text bold>Stack trace:</Text>
          {stack
            .asTable({})
            .split('\n')
            .map((line, index) => (
              <Text key={index}>{line}</Text>
            ))}
        </Box>
      )}
    </Banner>
  )
}

export {FatalError}
