import React, {useState, useEffect, useRef, useCallback} from 'react'
import {Box, Text, useApp, useInput} from 'ink'
import {isEqual} from 'lodash-es'

export interface Props {
  items: Item[]
  onSelect: (item: Item) => void
}

export interface Item {
  label: string
  value: string
  key?: string
}

interface ItemProps {
  item: Item
  isSelected: boolean
  index: number
  key?: string
}

const SelectInput: React.FC<Props> = ({items, onSelect}): JSX.Element | null => {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const keys = useRef(new Set(items.map((item) => item.key)))
  const {exit: unmountInk} = useApp()

  const previousItems = useRef<Item[]>(items)

  useEffect(() => {
    if (
      !isEqual(
        previousItems.current.map((item) => item.value),
        items.map((item) => item.value),
      )
    ) {
      setSelectedIndex(0)
    }

    previousItems.current = items
  }, [items])

  useInput(
    useCallback(
      (input, key) => {
        const parsedInput = parseInt(input, 10)

        if (parsedInput !== 0 && parsedInput <= items.length + 1) {
          setSelectedIndex(parsedInput - 1)
        } else if (keys.current.has(input)) {
          const index = items.findIndex((item) => item.key === input)
          if (index !== -1) {
            setSelectedIndex(index)
          }
        }

        if (key.upArrow) {
          const lastIndex = items.length - 1

          setSelectedIndex(selectedIndex === 0 ? lastIndex : selectedIndex - 1)
        } else if (key.downArrow) {
          setSelectedIndex(selectedIndex === items.length - 1 ? 0 : selectedIndex + 1)
        } else if (key.return) {
          onSelect(items[selectedIndex]!)
          unmountInk()
        }
      },
      [selectedIndex, items, onSelect],
    ),
  )

  return (
    <Box flexDirection="column">
      {items.map((item, index) => {
        const isSelected = index === selectedIndex

        return (
          <Box key={item.value}>
            <Box marginRight={2}>{isSelected ? <Text color="cyan">{`>`}</Text> : <Text> </Text>}</Box>

            <Text color={isSelected ? 'cyan' : undefined}>{`(${item.key ?? index + 1}) ${item.label}`}</Text>
          </Box>
        )
      })}

      <Box marginTop={1} marginLeft={3}>
        <Text dimColor>navigate with arrows, enter to select</Text>
      </Box>
    </Box>
  )
}

export default SelectInput
