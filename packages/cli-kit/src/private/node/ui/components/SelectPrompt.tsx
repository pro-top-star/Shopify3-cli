import SelectInput, {Props as SelectProps, Item as SelectItem, Item} from './SelectInput.js'
import Table, {Props as TableProps} from './Table.js'
import {TextInput} from './TextInput.js'
import {handleCtrlC} from '../../ui.js'
import React, {ReactElement, useCallback, useState} from 'react'
import {Box, Text, useApp, useInput} from 'ink'
import {figures} from 'listr2'
import {debounce} from '@shopify/cli-kit/common/function'

export interface Props<T> {
  message: string
  choices: SelectProps<T>['items']
  onSubmit: (value: T) => void
  infoTable?: TableProps['table']
  search?: (term: string) => Promise<SelectItem<T>[]>
}

function SelectPrompt<T>({
  message,
  choices,
  infoTable,
  onSubmit,
  search,
}: React.PropsWithChildren<Props<T>>): ReactElement | null {
  const isAutocomplete = Boolean(search)
  const [answer, setAnswer] = useState<SelectItem<T>>(choices[0]!)
  const {exit: unmountInk} = useApp()
  const [submitted, setSubmitted] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<SelectItem<T>[]>(choices)

  useInput(
    useCallback(
      (input, key) => {
        handleCtrlC(input, key)

        if (key.return) {
          setSubmitted(true)
          unmountInk()
          onSubmit(answer.value)
        }
      },
      [answer, onSubmit],
    ),
  )

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box>
        <Box marginRight={2}>
          <Text>?</Text>
        </Box>
        <Text>{message}</Text>
        {isAutocomplete && !submitted && (
          <Box marginLeft={2}>
            <TextInput
              value={searchTerm}
              onChange={(term) => {
                setSearchTerm(term)

                if (term.length > 0) {
                  debounce(() => {
                    search!(term)
                      .then((result) => {
                        setSearchResults(result.slice(0, 14))
                      })
                      .catch(() => {})
                  }, 300)()
                } else {
                  setSearchResults(choices)
                }
              }}
              placeholder="Type to search..."
            />
          </Box>
        )}
      </Box>
      {infoTable && !submitted && (
        <Box marginLeft={7} marginTop={1}>
          <Table table={infoTable} />
        </Box>
      )}
      {submitted ? (
        <Box>
          <Box marginRight={2}>
            <Text color="cyan">{figures.tick}</Text>
          </Box>

          <Text color="cyan">{answer.label}</Text>
        </Box>
      ) : (
        <Box marginTop={1}>
          <SelectInput
            items={isAutocomplete ? searchResults : choices}
            onChange={(item: Item<T>) => {
              setAnswer(item)
            }}
            enableShortcuts={!isAutocomplete}
          />
        </Box>
      )}
    </Box>
  )
}

export {SelectPrompt}
