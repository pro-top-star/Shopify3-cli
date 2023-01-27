import {Task, Tasks} from './Tasks.js'
import {getLastFrameAfterUnmount} from '../../testing/ui.js'
import {unstyled} from '../../../../public/node/output.js'
import React from 'react'
import {describe, expect, test, vi} from 'vitest'
import {render} from 'ink-testing-library'

describe('Tasks', () => {
  test('shows a loading state at the start', async () => {
    // Given
    const firstTaskFunction = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 2000))
    })

    const firstTask = {
      title: 'task 1',
      task: firstTaskFunction,
    }

    // When
    const renderInstance = render(<Tasks tasks={[firstTask]} silent={false} />)
    // wait for next tick
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Then
    expect(unstyled(getLastFrameAfterUnmount(renderInstance)!)).toMatchInlineSnapshot(`
      "▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
      task 1 ..."
    `)
    expect(firstTaskFunction).toHaveBeenCalled()
  })

  test('shows nothing at the end in case of success', async () => {
    // Given
    const firstTaskFunction = vi.fn(async () => {})
    const secondTaskFunction = vi.fn(async () => {})

    const firstTask = {
      title: 'task 1',
      task: firstTaskFunction,
    }

    const secondTask = {
      title: 'task 2',
      task: secondTaskFunction,
    }
    // When

    const renderInstance = render(<Tasks tasks={[firstTask, secondTask]} silent={false} />)

    // wait for next tick
    await new Promise((resolve) => setTimeout(resolve, 0))

    // Then
    expect(getLastFrameAfterUnmount(renderInstance)).toMatchInlineSnapshot('""')
  })

  test('shows nothing at the end in case of success', async () => {
    // Given
    const secondTaskFunction = vi.fn(async () => {})

    const firstTask: Task = {
      title: 'task 1',
      task: async () => {
        throw new Error('something went wrong')
      },
    }

    const secondTask = {
      title: 'task 2',
      task: secondTaskFunction,
    }

    // When
    const renderInstance = render(<Tasks tasks={[firstTask, secondTask]} silent={false} />)

    // wait for next tick
    await new Promise((resolve) => setTimeout(resolve, 0))

    // Then
    expect(getLastFrameAfterUnmount(renderInstance)).toMatchInlineSnapshot('""')
    expect(secondTaskFunction).toHaveBeenCalledTimes(0)
  })

  test('it supports subtasks', async () => {
    // Given
    const firstSubtaskFunction = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 2000))
    })

    const firstTask = {
      title: 'task 1',
      task: async () => {
        return [
          {
            title: 'subtask 1',
            task: firstSubtaskFunction,
          },
          {
            title: 'subtask 2',
            task: async () => {},
          },
        ]
      },
    }

    const secondTask = {
      title: 'task 2',
      task: async () => {},
    }

    // When
    const renderInstance = render(<Tasks tasks={[firstTask, secondTask]} silent={false} />)

    // wait for next tick
    await new Promise((resolve) => setTimeout(resolve, 0))

    // Then
    expect(unstyled(getLastFrameAfterUnmount(renderInstance)!)).toMatchInlineSnapshot(`
      "▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
      subtask 1 ..."
    `)

    expect(firstSubtaskFunction).toHaveBeenCalled()
  })

  test('supports skipping', async () => {
    // Given
    const firstTaskFunction = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 2000))
    })

    const firstTask = {
      title: 'task 1',
      task: firstTaskFunction,
      skip: () => true,
    }

    const secondTask = {
      title: 'task 2',
      task: async () => {
        await new Promise((resolve) => setTimeout(resolve, 2000))
      },
    }

    // When
    const renderInstance = render(<Tasks tasks={[firstTask, secondTask]} silent={false} />)

    // wait for next tick
    await new Promise((resolve) => setTimeout(resolve, 0))

    // Then
    expect(unstyled(getLastFrameAfterUnmount(renderInstance)!)).toMatchInlineSnapshot(`
      "▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
      task 2 ..."
    `)
    expect(firstTaskFunction).toHaveBeenCalledTimes(0)
  })

  test('supports skipping a subtask', async () => {
    // Given
    const firstSubTaskFunction = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 2000))
    })

    const secondSubTaskFunction = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 2000))
    })

    const firstTask = {
      title: 'task 1',
      task: async () => {
        return [
          {
            title: 'subtask 1',
            task: firstSubTaskFunction,
            skip: () => true,
          },
          {
            title: 'subtask 2',
            task: secondSubTaskFunction,
          },
        ]
      },
    }

    // When
    const renderInstance = render(<Tasks tasks={[firstTask]} silent={false} />)

    // wait for next tick
    await new Promise((resolve) => setTimeout(resolve, 0))

    // Then
    expect(unstyled(getLastFrameAfterUnmount(renderInstance)!)).toMatchInlineSnapshot(`
      "▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
      subtask 2 ..."
    `)

    expect(firstSubTaskFunction).toHaveBeenCalledTimes(0)
    expect(secondSubTaskFunction).toHaveBeenCalled()
  })

  test('supports retrying', async () => {
    // Given
    let retryCount = 0

    const firstTaskFunction = vi.fn(async (_ctx, task) => {
      if (retryCount < task.retry - 1) {
        retryCount++
        throw new Error(`something went wrong${retryCount}`)
      }

      await new Promise((resolve) => setTimeout(resolve, 2000))
    })

    const firstTask: Task = {
      title: 'task 1',
      task: firstTaskFunction,
      retry: 3,
    }

    // When
    const renderInstance = render(<Tasks tasks={[firstTask]} silent={false} />)

    // wait for next tick
    await new Promise((resolve) => setTimeout(resolve, 0))

    // Then
    expect(unstyled(getLastFrameAfterUnmount(renderInstance)!)).toMatchInlineSnapshot(`
      "▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
      task 1 ..."
    `)
    expect(firstTask.retryCount).toBe(2)
    expect(firstTask.errors).toEqual([Error('something went wrong1'), Error('something went wrong2')])
  })

  test('supports retrying up to a limit', async () => {
    // Given
    let retryCount = 0

    const firstTaskFunction = vi.fn(async (_ctx, task) => {
      if (retryCount < task.retry) {
        retryCount++
        throw new Error(`something went wrong${retryCount}`)
      }

      await new Promise((resolve) => setTimeout(resolve, 2000))
    })

    const secondTaskFunction = vi.fn(async () => {})

    const firstTask: Task = {
      title: 'task 1',
      task: firstTaskFunction,
      retry: 3,
    }

    const secondTask: Task = {
      title: 'task 2',
      task: secondTaskFunction,
    }

    // When
    const renderInstance = render(<Tasks tasks={[firstTask, secondTask]} silent={false} />)

    // wait for next tick
    await new Promise((resolve) => setTimeout(resolve, 0))

    // Then
    expect(unstyled(getLastFrameAfterUnmount(renderInstance)!)).toMatchInlineSnapshot('""')
    expect(firstTask.retryCount).toBe(2)
    expect(firstTask.errors).toEqual([Error('something went wrong1'), Error('something went wrong2')])
    expect(secondTaskFunction).toHaveBeenCalledTimes(0)
  })

  test('supports retrying a subtask', async () => {
    // Given
    let retryCount = 0

    const firstSubTaskFunction = vi.fn(async (_ctx, task) => {
      if (retryCount < task.retry) {
        retryCount++
        throw new Error(`something went wrong${retryCount}`)
      }

      await new Promise((resolve) => setTimeout(resolve, 2000))
    })

    const firstSubTask: Task = {
      title: 'subtask 1',
      task: firstSubTaskFunction,
      retry: 3,
    }

    const firstTask: Task = {
      title: 'task 1',
      task: async () => {
        return [firstSubTask]
      },
    }

    // When
    const renderInstance = render(<Tasks tasks={[firstTask]} silent={false} />)

    // wait for next tick
    await new Promise((resolve) => setTimeout(resolve, 0))

    // Then
    expect(unstyled(getLastFrameAfterUnmount(renderInstance)!)).toMatchInlineSnapshot('""')
    expect(firstSubTask.retryCount).toBe(2)
    expect(firstSubTask.errors).toEqual([Error('something went wrong1'), Error('something went wrong2')])
  })

  test('supports retrying a subtask up to a limit', async () => {
    // Given
    let retryCount = 0

    const firstSubTaskFunction = vi.fn(async (_ctx, task) => {
      if (retryCount < task.retry) {
        retryCount++
        throw new Error(`something went wrong${retryCount}`)
      }

      await new Promise((resolve) => setTimeout(resolve, 2000))
    })

    const secondSubTaskFunction = vi.fn(async () => {})

    const firstSubTask: Task = {
      title: 'subtask 1',
      task: firstSubTaskFunction,
      retry: 3,
    }

    const secondSubTask: Task = {
      title: 'subtask 2',
      task: secondSubTaskFunction,
    }

    const firstTask: Task = {
      title: 'task 1',
      task: async () => {
        return [firstSubTask, secondSubTask]
      },
    }

    // When
    const renderInstance = render(<Tasks tasks={[firstTask]} silent={false} />)

    // wait for next tick
    await new Promise((resolve) => setTimeout(resolve, 0))

    // Then
    expect(unstyled(getLastFrameAfterUnmount(renderInstance)!)).toMatchInlineSnapshot('""')
    expect(firstSubTask.retryCount).toBe(2)
    expect(firstSubTask.errors).toEqual([Error('something went wrong1'), Error('something went wrong2')])
    expect(secondSubTaskFunction).toHaveBeenCalledTimes(0)
  })

  test('has a context', async () => {
    // Given
    const firstTaskFunction = vi.fn(async (ctx) => {
      ctx.foo = 'bar'
    })

    const firstTask: Task<{foo: string}> = {
      title: 'task 1',
      task: firstTaskFunction,
    }

    const secondTask: Task<{foo: string}> = {
      title: 'task 2',
      task: async (ctx) => {
        if (ctx.foo !== 'bar') {
          throw new Error('context is not shared')
        }
      },
    }

    const thirdTaskFunction = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 2000))
    })

    const thirdTask: Task<{foo: string}> = {
      title: 'task 3',
      task: thirdTaskFunction,
    }

    // When
    const renderInstance = render(<Tasks tasks={[firstTask, secondTask, thirdTask]} silent={false} />)

    // wait for next tick
    await new Promise((resolve) => setTimeout(resolve, 0))

    // Then
    expect(unstyled(getLastFrameAfterUnmount(renderInstance)!)).toMatchInlineSnapshot(`
      "▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
      task 3 ..."
    `)
    expect(thirdTaskFunction).toHaveBeenCalled()
  })
})
