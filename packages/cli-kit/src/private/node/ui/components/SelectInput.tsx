import {isEqual} from '../../../../public/common/lang.js'
import {groupBy} from '../../../../public/common/collection.js'
import {mapValues} from '../../../../public/common/object.js'
import React, {useState, useEffect, useRef, useCallback} from 'react'
import {Box, Key, useInput, Text} from 'ink'

export interface Props<T> {
  items: Item<T>[]
  onChange: (item: Item<T>) => void
}

export interface Item<T> {
  label: string
  value: T
  key?: string
  group?: string
}

function groupItems<T>(items: Item<T>[]) {
  let index = 0

  return mapValues(groupBy(items, 'group'), (groupItems) =>
    groupItems.map((groupItem) => {
      const item = {...groupItem, key: groupItem.key ?? (index + 1).toString(), index}
      index += 1
      return item
    }),
  )
}

export default function SelectInput<T>({items, onChange}: React.PropsWithChildren<Props<T>>): JSX.Element | null {
  const [inputStack, setInputStack] = useState<string | null>(null)
  const [inputTimeout, setInputTimeout] = useState<NodeJS.Timeout | null>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const keys = useRef(new Set(items.map((item) => item.key)))
  const groupedItems = groupItems(items)
  const groupTitles = Object.keys(groupedItems)

  const previousItems = useRef<Item<T>[]>(items)

  const changeSelection = useCallback(
    (index: number) => {
      const item = items[index]!
      setSelectedIndex(index)
      onChange(item)
    },
    [items],
  )

  // reset index when items change
  useEffect(() => {
    if (
      !isEqual(
        previousItems.current.map((item) => item.value),
        items.map((item) => item.value),
      )
    ) {
      changeSelection(0)
    }

    previousItems.current = items
  }, [items])

  const handleInput = useCallback(
    (input: string, key: Key) => {
      const parsedInput = parseInt(input, 10)

      if (parsedInput !== 0 && parsedInput <= items.length + 1) {
        changeSelection(parsedInput - 1)
      } else if (keys.current.has(input)) {
        const index = items.findIndex((item) => item.key === input)
        if (index !== -1) {
          changeSelection(index)
        }
      }

      if (key.upArrow) {
        const lastIndex = items.length - 1

        changeSelection(selectedIndex === 0 ? lastIndex : selectedIndex - 1)
      } else if (key.downArrow) {
        changeSelection(selectedIndex === items.length - 1 ? 0 : selectedIndex + 1)
      }
    },
    [selectedIndex, items],
  )

  useInput((input, key) => {
    if (input.length > 0 && Object.values(key).every((value) => value === false)) {
      const newInputStack = inputStack === null ? input : inputStack + input

      setInputStack(newInputStack)

      if (inputTimeout !== null) {
        clearTimeout(inputTimeout)
      }

      setInputTimeout(
        setTimeout(() => {
          handleInput(newInputStack, key)
          setInputStack(null)
          setInputTimeout(null)
        }, 300),
      )
    } else {
      handleInput(input, key)
    }
  })

  return (
    <Box flexDirection="column">
      {groupTitles.map((title) => {
        const hasTitle = title !== 'undefined'

        return (
          <Box key={title} flexDirection="column" marginTop={hasTitle ? 1 : 0}>
            {hasTitle && (
              <Box marginLeft={3}>
                <Text bold>{title}</Text>
              </Box>
            )}
            {groupedItems[title]!.map((item) => {
              const isSelected = item.index === selectedIndex

              return (
                <Box key={item.key}>
                  <Box marginRight={2}>{isSelected ? <Text color="cyan">{`>`}</Text> : <Text> </Text>}</Box>

                  <Text color={isSelected ? 'cyan' : undefined}>{`(${item.key}) ${item.label}`}</Text>
                </Box>
              )
            })}
          </Box>
        )
      })}

      <Box marginTop={1} marginLeft={3}>
        <Text dimColor>navigate with arrows, enter to select</Text>
      </Box>
    </Box>
  )
}
