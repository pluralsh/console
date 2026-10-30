export const isDocumentHidden = () =>
  typeof document !== 'undefined' && document.visibilityState === 'hidden'
