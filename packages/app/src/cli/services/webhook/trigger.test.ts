import {webhookTriggerService} from './trigger.js'
import {WebhookTriggerOptions} from './trigger-options.js'
import {getWebhookSample} from './request-sample.js'
import {requestApiVersions} from './request-api-versions.js'
import {triggerLocalWebhook} from './trigger-local-webhook.js'
import {optionsPrompt, WebhookTriggerFlags} from '../../prompts/webhook/options-prompt.js'
import {output} from '@shopify/cli-kit'
import {ensureAuthenticatedPartners} from '@shopify/cli-kit/node/session'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

const aToken = 'A_TOKEN'
const samplePayload = '{ "sampleField": "SampleValue" }'
const sampleHeaders = '{ "header": "Header Value" }'
const aTopic = 'A_TOPIC'
const aVersion = 'A_VERSION'
const aSecret = 'A_SECRET'
const aPort = '1234'
const aUrlPath = '/a/url/path'
const anAddress = 'http://example.org'

beforeEach(async () => {
  vi.mock('@shopify/cli-kit')
  vi.mock('@shopify/cli-kit/node/session')
  vi.mock('../../prompts/webhook/options-prompt.js')
  vi.mock('./request-sample.js')
  vi.mock('./request-api-versions.js')
  vi.mock('./trigger-local-webhook.js')
})

afterEach(async () => {
  vi.clearAllMocks()
})

const emptyJson = '{}'
const successDirectResponse = {
  samplePayload,
  headers: sampleHeaders,
  success: true,
  userErrors: [],
}
const successEmptyResponse = {
  samplePayload: emptyJson,
  headers: emptyJson,
  success: true,
  userErrors: [],
}
const aFullLocalAddress = `http://localhost:${aPort}${aUrlPath}`

describe('execute', () => {
  beforeEach(async () => {
    vi.mocked(ensureAuthenticatedPartners).mockResolvedValue(aToken)
  })

  it('notifies about request errors', async () => {
    // Given
    const response = {
      samplePayload: emptyJson,
      headers: emptyJson,
      success: false,
      userErrors: [
        {message: '["Invalid topic pizza/update"]', fields: ['field1']},
        {message: '["Unable to notify example"]', fields: ['field2']},
      ],
    }
    vi.mocked(getWebhookSample).mockResolvedValue(response)
    vi.mocked(requestApiVersions).mockResolvedValue([aVersion])
    vi.mocked(optionsPrompt).mockResolvedValue(sampleOptions())

    const outputSpy = vi.spyOn(output, 'consoleError')

    // When
    await webhookTriggerService(sampleFlags())

    // Then
    expect(outputSpy).toHaveBeenCalledWith(
      `Request errors:\n  · Invalid topic pizza/update\n  · Unable to notify example`,
    )
    expect(requestApiVersions).toHaveBeenCalledWith(aToken)
  })

  it('Safe notification in case of unexpected request errors', async () => {
    // Given
    const response = {
      samplePayload: emptyJson,
      headers: emptyJson,
      success: false,
      userErrors: [
        {message: 'Something not JSON', fields: ['field1']},
        {message: 'Another invalid JSON', fields: ['field2']},
      ],
    }
    vi.mocked(getWebhookSample).mockResolvedValue(response)
    vi.mocked(requestApiVersions).mockResolvedValue([aVersion])
    vi.mocked(optionsPrompt).mockResolvedValue(sampleOptions())

    const outputSpy = vi.spyOn(output, 'consoleError')

    // When
    await webhookTriggerService(sampleFlags())

    // Then
    expect(outputSpy).toHaveBeenCalledWith(`Request errors:\n${JSON.stringify(response.userErrors)}`)
  })

  it('notifies about real delivery being sent', async () => {
    // Given
    vi.mocked(triggerLocalWebhook)
    vi.mocked(getWebhookSample).mockResolvedValue(successEmptyResponse)
    vi.mocked(requestApiVersions).mockResolvedValue([aVersion])
    vi.mocked(optionsPrompt).mockResolvedValue(sampleRemoteOptions())

    const outputSpy = vi.spyOn(output, 'success')

    // When
    await webhookTriggerService(sampleFlags())

    // Then
    expect(requestApiVersions).toHaveBeenCalledWith(aToken)
    expect(getWebhookSample).toHaveBeenCalledWith(aToken, aTopic, aVersion, 'http', anAddress, aSecret)
    expect(triggerLocalWebhook).toHaveBeenCalledTimes(0)
    expect(outputSpy).toHaveBeenCalledWith('Webhook has been enqueued for delivery')
  })

  describe('Localhost delivery', () => {
    it('delivers to localhost', async () => {
      // Given
      vi.mocked(getWebhookSample).mockResolvedValue(successDirectResponse)
      vi.mocked(triggerLocalWebhook).mockResolvedValue(true)
      vi.mocked(requestApiVersions).mockResolvedValue([aVersion])
      vi.mocked(optionsPrompt).mockResolvedValue(sampleLocalhostOptions())

      const outputSpy = vi.spyOn(output, 'success')

      // When
      await webhookTriggerService(sampleFlags())

      // Then
      expect(requestApiVersions).toHaveBeenCalledWith(aToken)
      expect(getWebhookSample).toHaveBeenCalledWith(aToken, aTopic, aVersion, 'localhost', aFullLocalAddress, aSecret)
      expect(triggerLocalWebhook).toHaveBeenCalledWith(aFullLocalAddress, samplePayload, sampleHeaders)
      expect(outputSpy).toHaveBeenCalledWith('Localhost delivery sucessful')
    })

    it('shows an error if localhost is not ready', async () => {
      // Given
      vi.mocked(getWebhookSample).mockResolvedValue(successDirectResponse)
      vi.mocked(triggerLocalWebhook).mockResolvedValue(false)
      vi.mocked(requestApiVersions).mockResolvedValue([aVersion])
      vi.mocked(optionsPrompt).mockResolvedValue(sampleLocalhostOptions())

      const outputSpy = vi.spyOn(output, 'consoleError')

      // When
      await webhookTriggerService(sampleFlags())

      // Then
      expect(requestApiVersions).toHaveBeenCalledWith(aToken)
      expect(getWebhookSample).toHaveBeenCalledWith(aToken, aTopic, aVersion, 'localhost', aFullLocalAddress, aSecret)
      expect(triggerLocalWebhook).toHaveBeenCalledWith(aFullLocalAddress, samplePayload, sampleHeaders)
      expect(outputSpy).toHaveBeenCalledWith('Localhost delivery failed')
    })
  })

  function sampleFlags(): WebhookTriggerFlags {
    const flags: WebhookTriggerFlags = {
      topic: aTopic,
      apiVersion: aVersion,
      deliveryMethod: 'event-bridge',
      sharedSecret: aSecret,
      address: '',
    }

    return flags
  }

  function sampleOptions(): WebhookTriggerOptions {
    const options: WebhookTriggerOptions = {
      topic: aTopic,
      apiVersion: aVersion,
      deliveryMethod: 'event-bridge',
      sharedSecret: aSecret,
      address: '',
    }

    return options
  }

  function sampleLocalhostOptions(): WebhookTriggerOptions {
    const options: WebhookTriggerOptions = {
      topic: aTopic,
      apiVersion: aVersion,
      deliveryMethod: 'localhost',
      sharedSecret: aSecret,
      address: aFullLocalAddress,
    }

    return options
  }

  function sampleRemoteOptions(): WebhookTriggerOptions {
    const options: WebhookTriggerOptions = {
      topic: aTopic,
      apiVersion: aVersion,
      deliveryMethod: 'http',
      sharedSecret: aSecret,
      address: anAddress,
    }

    return options
  }
})
