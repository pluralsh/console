import Embed from '../components/Embed'

export const embed = {
  render: Embed,
  description: 'Render embeddable content using react-embed',
  attributes: {
    url: { type: String, required: true, description: 'URL to display.' },
    isDark: {
      type: Boolean,
      description:
        'True if dark mode enable. In that case will try to render content on dark background.',
    },
    aspectRatio: {
      type: String,
      description: "The aspect ratio of the media file (e.g. '16 / 9')",
    },
    width: {
      type: Number,
      description:
        'Number of pixels the maximum space available to the component. If not provided defaults to window width.',
    },
  },
}
