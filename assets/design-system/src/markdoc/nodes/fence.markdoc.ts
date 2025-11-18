import { Fence } from '../components/Fence'
import { type BaseSchema } from '../types'

export const fence: BaseSchema = {
  render: Fence,
  attributes: {
    content: { type: String, render: true, required: true },
    language: { type: String },
    process: { type: Boolean, render: true, default: false },
    showHeader: { type: Boolean, required: false, render: true },
    title: { type: String, required: false },
  },
}
