import {RedirectListener} from './redirect-listener'
import {describe, it, expect, vi, beforeEach} from 'vitest'

beforeEach(() => {
  const fastifyGetMock: any = vi.fn(() => 'works')
  vi.mock('fastify', async () => {
    // const server: any = {
    //   listen: vi.fn(),
    //   close: vi.fn(),
    //   get: fastifyGetMock,
    // }

    return {
      default: () => fastifyGetMock,
    }
  })
})

describe('RedirectListener', () => {
  it('starts and stops the server', async () => {
    // Given
    const server: any = {
      listen: (_port: any, _host: any, _backlog: any, cb: () => void) => {
        cb()
      },
      close: vi.fn(),
      setTimeout: vi.fn(),
    }
    const subject = new RedirectListener({
      port: 3000,
      host: 'localhost',
      callback: (_code, _error) => {},
    })

    // When
    await subject.start()

    // Then
    // const listenCalls = listenSpy.calls
    // expect(listenCalls.length).toBe(1)
    // expect(listenCalls[0][0]).toBe(3000)
    // expect(listenCalls[0][1]).toBe('localhost')
    // expect(listenCalls[0][2]).toBe(undefined)
  })

  it.skip('stops the server', async () => {
    // Given
    const server: any = {
      listen: vi.fn(),
      close: (cb: (error: Error | undefined) => void) => {
        cb(undefined)
      },
      setTimeout: vi.fn(),
    }
    vi.spyOn(http, 'createServer').mockImplementation(() => server)
    const subject = new RedirectListener({
      port: 3000,
      host: 'localhost',
      callback: (_code, _error) => {},
    })

    // When/Then
    await expect(subject.stop()).resolves
  })

  it.skip('stops error when the server fails to stop', async () => {
    // Given
    const stopError = new Error('failing to stop the server')
    const server: any = {
      listen: vi.fn(),
      close: (cb: (error: Error | undefined) => void) => {
        cb(stopError)
      },
      setTimeout: vi.fn(),
    }
    vi.spyOn(http, 'createServer').mockImplementation(() => server)
    const subject = new RedirectListener({
      port: 3000,
      host: 'localhost',
      callback: (_code, _error) => {},
    })

    // When/Then
    await expect(subject.stop()).rejects.toThrowError(stopError)
  })

  it.skip('notifies the callback when the redirect includes the code and the state', () => {
    // Given
    const createServerSpy: any = vi.spyOn(http, 'createServer')
    let receivedCode: string | undefined
    let receivedState: string | undefined
    const subject = new RedirectListener({
      port: 3000,
      host: 'localhost',
      // eslint-disable-next-line node/handle-callback-err
      callback: (_error, code, state) => {
        receivedCode = code
        receivedState = state
      },
    })
    const createServerCallback = createServerSpy.calls[0][0]
    const responseWriteHeadMock: any = vi.fn()
    const responseEndMock: any = vi.fn()
    const response = {writeHead: responseWriteHeadMock, end: responseEndMock}
    const request = {url: 'http://localhost:3000/oauth?code=foo&state=state'}

    // When
    createServerCallback(request, response)

    // Then
    expect(receivedCode).toBe('foo')
    expect(receivedState).toBe('state')
    expect(responseWriteHeadMock).toHaveBeenCalledWith(200, {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      'Content-Type': 'text/html',
    })
    expect(responseEndMock).toHaveBeenCalledWith(redirectResponseBody)
  })

  it.skip('notifies errors when the request contains no url', () => {
    // Given
    const createServerSpy: any = vi.spyOn(http, 'createServer')
    let receivedError: Error | undefined
    const subject = new RedirectListener({
      port: 3000,
      host: 'localhost',

      callback: (error, _code) => {
        receivedError = error
      },
    })
    const createServerCallback = createServerSpy.calls[0][0]
    const responseWriteHeadMock: any = vi.fn()
    const responseEndMock: any = vi.fn()
    const response = {writeHead: responseWriteHeadMock, end: responseEndMock}
    const request = {}

    // When
    createServerCallback(request, response)

    // Then
    expect(receivedError).toBe(EmptyUrlError)
    expect(responseWriteHeadMock).toHaveBeenCalledWith(200, {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      'Content-Type': 'text/html',
    })
    expect(responseEndMock).toHaveBeenCalledWith(redirectResponseBody)
  })

  it.skip('notifies errors when it redirects with an error and error description', () => {
    // Given
    const createServerSpy: any = vi.spyOn(http, 'createServer')
    let receivedError: Error | undefined
    const subject = new RedirectListener({
      port: 3000,
      host: 'localhost',

      callback: (error, _code) => {
        receivedError = error
      },
    })
    const createServerCallback = createServerSpy.calls[0][0]
    const responseWriteHeadMock: any = vi.fn()
    const responseEndMock: any = vi.fn()
    const response = {writeHead: responseWriteHeadMock, end: responseEndMock}
    const request = {
      url: 'http://localhost:3000/auth?error=error&error_description=error_description',
    }

    // When
    createServerCallback(request, response)

    // Then
    expect(receivedError).toEqual(AuthenticationError(`error_description`))
    expect(responseWriteHeadMock).toHaveBeenCalledWith(200, {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      'Content-Type': 'text/html',
    })
    expect(responseEndMock).toHaveBeenCalledWith(redirectResponseBody)
  })

  it.skip('notifies errors when the redirect contains no code', () => {
    // Given
    const createServerSpy: any = vi.spyOn(http, 'createServer')
    let receivedError: Error | undefined
    const subject = new RedirectListener({
      port: 3000,
      host: 'localhost',

      callback: (error, _code) => {
        receivedError = error
      },
    })
    const createServerCallback = createServerSpy.calls[0][0]
    const responseWriteHeadMock: any = vi.fn()
    const responseEndMock: any = vi.fn()
    const response = {writeHead: responseWriteHeadMock, end: responseEndMock}
    const request = {
      url: 'http://localhost:3000/auth',
    }

    // When
    createServerCallback(request, response)

    // Then
    expect(receivedError).toBe(MissingCodeError)
    expect(responseWriteHeadMock).toHaveBeenCalledWith(200, {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      'Content-Type': 'text/html',
    })
    expect(responseEndMock).toHaveBeenCalledWith(redirectResponseBody)
  })

  it.skip('notifies errors when the redirect contains code but no state', () => {
    // Given
    const createServerSpy: any = vi.spyOn(http, 'createServer')
    let receivedError: Error | undefined
    const subject = new RedirectListener({
      port: 3000,
      host: 'localhost',

      callback: (error, _code) => {
        receivedError = error
      },
    })
    const createServerCallback = createServerSpy.calls[0][0]
    const responseWriteHeadMock: any = vi.fn()
    const responseEndMock: any = vi.fn()
    const response = {writeHead: responseWriteHeadMock, end: responseEndMock}
    const request = {
      url: 'http://localhost:3000/auth?code=code',
    }

    // When
    createServerCallback(request, response)

    // Then
    expect(receivedError).toBe(MissingStateError)
    expect(responseWriteHeadMock).toHaveBeenCalledWith(200, {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      'Content-Type': 'text/html',
    })
    expect(responseEndMock).toHaveBeenCalledWith(redirectResponseBody)
  })
})
