const unwrapParagraph = child => {
  if (child?.name === 'Paragraph') {
    return child?.children
  }

  return child
}

const unwrapParagraphs = children => {
  if (!Array.isArray(children)) {
    return unwrapParagraph(children)
  }

  return children.map(unwrapParagraph).flat()
}

export default unwrapParagraphs
