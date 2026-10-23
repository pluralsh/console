import { Embed } from '../components/Embed'

import { type BaseSchema } from '../types'

export const embed: BaseSchema = {
  render: Embed,
  description: 'Embed a video (YouTube, Loom, Vimeo) or other iframe content',
  selfClosing: true,
  attributes: {
    url: {
      type: String,
      required: true,
      description: 'URL of the video or page to embed',
    },
    title: {
      type: String,
      description: 'Accessible title for the embedded frame',
    },
    aspectRatio: {
      type: String,
      description: 'CSS aspect-ratio of the frame, e.g. "16 / 9" (default)',
    },
  },
}
