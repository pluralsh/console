import rego from '@styra/highlightjs-rego'
import hljs from 'highlight.js/lib/core'

if (!hljs.getLanguage('rego')) {
  hljs.registerLanguage('rego', rego)
}
