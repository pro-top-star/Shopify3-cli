import {createFunctionSpecification} from '../functions.js'

const spec = createFunctionSpecification({
  identifier: 'payment_customization',
  externalIdentifier: 'payment_customization',
  externalName: 'Payment customization',
  gated: true,
  templatePath: (lang) => `checkout/${lang}/payment-customization/default`,
})

export default spec
