import {ensureDevEnvironment} from './dev/environment'
import {App} from '../models/app/app'

interface DevOptions {
  appInfo: App
}

async function dev({appInfo}: DevOptions) {
  const {org, app, store} = await ensureDevEnvironment(appInfo)
  // Create tunnel etc...
}

export default dev
