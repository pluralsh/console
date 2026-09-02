import { markdocTags as designSystemTags } from '@pluralsh/design-system'

import { doclink } from './doclink'
import { htmlTag } from './htmlTag.markdoc'
import { mermaid } from './mermaid'
import { comment, head, link, script } from './nextjs.markdoc'

export const tags = {
  ...designSystemTags,
  comment,
  head,
  script,
  link,
  'html-tag': htmlTag,
  doclink,
  mermaid,
}
