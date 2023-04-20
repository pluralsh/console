import Link from '../components/Link'
import { type BaseSchema } from '../types'

export const link: BaseSchema = {
  render: Link,
  attributes: {
    href: { type: String },
  },
}
