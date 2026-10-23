import { markdocTags as designSystemTags } from '@pluralsh/design-system'

import { callout } from './callout'
import { doclink } from './doclink'
import { hierarchy, hierarchyNode } from './hierarchy'
import { htmlTag } from './htmlTag.markdoc'
import { mermaid } from './mermaid'
import { comment, head, link, script } from './nextjs.markdoc'

export const tags = {
  ...designSystemTags,
  callout,
  comment,
  head,
  script,
  link,
  'html-tag': htmlTag,
  doclink,
  hierarchy,
  'hierarchy-node': hierarchyNode,
  mermaid,
}
