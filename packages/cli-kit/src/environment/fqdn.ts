import {isSpinEnvironment, spinFqdn} from '../public/node/environment/spin.js'
import {Abort} from '../error.js'
import {serviceEnvironment} from '../private/node/environment/service.js'

export const CouldntObtainPartnersSpinFQDNError = new Abort(
  "Couldn't obtain the Spin FQDN for Partners when the CLI is not running from a Spin environment.",
)
export const CouldntObtainIdentitySpinFQDNError = new Abort(
  "Couldn't obtain the Spin FQDN for Identity when the CLI is not running from a Spin environment.",
)
export const CouldntObtainShopifySpinFQDNError = new Abort(
  "Couldn't obtain the Spin FQDN for Shopify when the CLI is not running from a Spin environment.",
)
export const NotProvidedStoreFQDNError = new Abort(
  "Couldn't obtain the Shopify FQDN because the store FQDN was not provided.",
)

/**
 * It returns the Partners' API service we should interact with.
 * @returns Fully-qualified domain of the partners service we should interact with.
 */
export async function partnersFqdn(): Promise<string> {
  const environment = serviceEnvironment()
  const productionFqdn = 'partners.shopify.com'
  switch (environment) {
    case 'local':
      return 'partners.myshopify.io'
    case 'spin':
      return `partners.${await spinFqdn()}`
    default:
      return productionFqdn
  }
}

/**
 * It returns the Identity service we should interact with.
 * @returns Fully-qualified domain of the Identity service we should interact with.
 */
export async function identityFqdn(): Promise<string> {
  const environment = serviceEnvironment()
  const productionFqdn = 'accounts.shopify.com'
  switch (environment) {
    case 'local':
      return 'identity.myshopify.io'
    case 'spin':
      return `identity.${await spinFqdn()}`
    default:
      return productionFqdn
  }
}

/**
 * Given a store, returns a valid store fqdn removing protocol and adding the proper domain in case is missing
 * @param store - Original store name provided by the user
 * @returns a valid store fqdn
 */
export async function normalizeStoreName(store: string) {
  const storeFqdn = store.replace(/^https?:\/\//, '').replace(/\/$/, '')
  const addDomain = async (storeFqdn: string) =>
    isSpinEnvironment() ? `${storeFqdn}.shopify.${await spinFqdn()}` : `${storeFqdn}.myshopify.com`
  const containDomain = (storeFqdn: string) => storeFqdn.includes('.myshopify.com') || storeFqdn.includes('spin.dev')
  return containDomain(storeFqdn) ? storeFqdn : addDomain(storeFqdn)
}
