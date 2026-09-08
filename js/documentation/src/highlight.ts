import { hljs } from '@pluralsh/design-system'

import rego from '@styra/highlightjs-rego'

if (!hljs.getLanguage('rego')) {
  hljs.registerLanguage('rego', rego)
}
