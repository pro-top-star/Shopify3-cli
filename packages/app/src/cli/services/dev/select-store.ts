import {fetchAppsAndStores} from './fetch'
import {error, output, session, http} from '@shopify/cli-kit'
import {OrganizationStore} from '$cli/models/organization'
import {reloadStoreListPrompt, selectStorePrompt} from '$cli/prompts/dev'

const CreateStoreLink = (orgId: string) => {
  const url = `https://partners.shopify.com/${orgId}/stores/new?store_type=dev_store`
  return `Click here to create a new dev store to preview your project:\n${url}\n`
}

/**
 * Select store from list or
 * If a cachedStoreName is provided, we check if it is valid and return it. If it's not valid, ignore it.
 * If there are no stores, show a link to create a store and prompt the user to refresh the store list
 * If no store is finally selected, exit process
 * @param stores {OrganizationStore[]} List of available stores
 * @param orgId {string} Current organization ID
 * @param cachedStoreName {string} Cached store name
 * @returns {Promise<string>} The selected store
 */
export async function selectStore(
  stores: OrganizationStore[],
  orgId: string,
  cachedStoreName?: string,
): Promise<string> {
  if (cachedStoreName) {
    const isValid = await validateStore(cachedStoreName)
    if (isValid) return cachedStoreName
  }

  const store = await selectStorePrompt(stores)
  if (store) return store.shopDomain

  output.info(`\n${CreateStoreLink(orgId)}`)
  const reload = await reloadStoreListPrompt()
  if (!reload) throw new error.AbortSilent()

  const token = await session.ensureAuthenticatedPartners()
  const data = await fetchAppsAndStores(orgId, token)
  return selectStore(data.stores, orgId)
}

/**
 * Check if the provided storeDomain exists
 * @param storeDomain {string} Store domain to check
 * @returns {boolean} Whether the store exists or not
 */
export async function validateStore(storeDomain?: string): Promise<boolean> {
  const res = await http.fetch(`https://${storeDomain}/admin`, {method: 'HEAD'})
  return res.status === 200
}
