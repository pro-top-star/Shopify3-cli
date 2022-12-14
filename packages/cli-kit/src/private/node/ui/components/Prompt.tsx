import SelectInput, {Props as SelectProps, Item as SelectItem} from './SelectInput.js'
import React, {useState} from 'react'
import {Box, Text} from 'ink'

export interface Props {
  message: string
  choices: SelectProps['items']
  onChoose: SelectProps['onSelect']
}

const Prompt: React.FC<Props> = ({message, choices, onChoose}): JSX.Element | null => {
  const [answer, setAnswer] = useState<SelectItem | null>(null)

  return answer ? null : (
    <Box flexDirection="column">
      <Box>
        <Box marginRight={2}>
          <Text>?</Text>
        </Box>
        <Text>{message}</Text>
      </Box>
      <SelectInput
        items={choices}
        onSelect={(item: SelectItem) => {
          setAnswer(item)
          onChoose(item)
        }}
      />
    </Box>
  )
}

export default Prompt
