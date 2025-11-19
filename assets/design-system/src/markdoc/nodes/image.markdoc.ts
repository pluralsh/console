import Image from '../components/Image'
import { type BaseSchema } from '../types'

export const image: BaseSchema = {
  render: Image,
  attributes: {
    src: { type: String, required: true },
    alt: { type: String },
    title: { type: String },
    // width/height attributes will need to be to be implemented as an extension to markdown-it
  },
}
