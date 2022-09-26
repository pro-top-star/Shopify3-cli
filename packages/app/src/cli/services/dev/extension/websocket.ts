import {ExtensionsPayloadStoreEvent} from './payload/store.js'
import {SetupWebSocketConnectionOptions, WebsocketConnection} from './websocket/models.js'
import {payloadUpdateHandler, websocketUpgradeHandler} from './websocket/handlers.js'
import {WebSocketServer} from 'ws'

export function setupWebsocketConnection(options: SetupWebSocketConnectionOptions): WebsocketConnection {
  const wss = new WebSocketServer({noServer: true, clientTracking: true})

  options.httpServer.on('upgrade', websocketUpgradeHandler(wss, options))
  options.payloadStore.on(ExtensionsPayloadStoreEvent.Update, payloadUpdateHandler(wss, options))

  return {
    close: () => {
      wss.close()
    },
  }
}
