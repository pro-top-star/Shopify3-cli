import {DeployConfig, ReqDeployConfig} from './deploy/types.js'
import {createDeployment, healthCheck, uploadDeployment} from './deploy/upload.js'
import {buildTaskList} from './build.js'
import {validateProject, fillDeployConfig} from './deploy/config.js'
import {sleep} from '@shopify/cli-kit/node/system'
import {isUnitTest} from '@shopify/cli-kit/node/environment/local'
import {Task} from '@shopify/cli-kit/src/private/node/ui/components/Tasks.js'
import {renderTasks} from '@shopify/cli-kit/node/ui.js'

interface TaskContext {
  config: ReqDeployConfig
  deploymentID: string
  assetBaseURL: string
  previewURL: string
}

const backoffPolicy = [5, 10, 15, 30, 60]

export async function deployToOxygen(_config: DeployConfig) {
  await validateProject(_config)

  /* eslint-disable require-atomic-updates */
  const tasks: Task<TaskContext>[] = [
    {
      title: 'Getting deployment config',
      task: async (ctx) => {
        ctx.config = await fillDeployConfig(_config)
      },
    },
    {
      title: 'Initializing deployment',
      task: async (ctx, task) => {
        await shouldRetryOxygenCall(task, 'Could not create deployment on Oxygen.')

        const {deploymentID, assetBaseURL} = await createDeployment(ctx.config)
        ctx.assetBaseURL = assetBaseURL
        ctx.deploymentID = deploymentID
      },
      retry: backoffPolicy.length,
    },
    {
      title: 'Building project',
      task: async (ctx) => {
        const subTasks = buildTaskList({
          directory: ctx.config.path,
          targets: {
            client: true,
            worker: '@shopify/hydrogen/platforms/worker',
            node: false,
          },
          assetBaseURL: ctx.assetBaseURL,
        })

        return subTasks
      },
      skip: (ctx) => Boolean(ctx.config.pathToBuild),
    },
    {
      title: 'Uploading deployment files',
      task: async (ctx, task) => {
        await shouldRetryOxygenCall(task, 'Uploading files to Oxygen failed.')

        ctx.previewURL = await uploadDeployment(ctx.config, ctx.deploymentID)
      },
      retry: backoffPolicy.length,
    },
    {
      title: 'Checking deployment health',
      task: async (ctx, task) => {
        const retryCount = task.retryCount

        if (retryCount === backoffPolicy.length) {
          throw new Error(
            "The deployment uploaded but hasn't become reachable within 2 minutes. Check the preview URL to see if deployment succeeded. If it didn't, then try again later.",
          )
        }

        if (retryCount && !isUnitTest()) await sleep(backoffPolicy[retryCount - 1]!)

        await healthCheck(ctx.previewURL)
      },
      retry: backoffPolicy.length,
      skip: (ctx) => !ctx.config.healthCheck,
    },
  ]
  /* eslint-enable require-atomic-updates */

  await renderTasks(tasks)
}

async function shouldRetryOxygenCall(task: Task<TaskContext>, errorMessage: string) {
  const retryCount = task.retryCount
  const taskErrors = task.errors ?? []
  if (retryCount === backoffPolicy.length) {
    throw new Error(`${errorMessage} ${taskErrors[taskErrors.length - 1]?.message}`)
  }
  if (retryCount) {
    if (task.errors && task.errors.length > 0) {
      const unrecoverableError = task.errors.find((error) => error.message.includes('Unrecoverable'))
      if (unrecoverableError) {
        throw new Error(unrecoverableError.message)
      }
    }
  }
  if (retryCount && !isUnitTest()) await sleep(backoffPolicy[retryCount - 1]!)
}
