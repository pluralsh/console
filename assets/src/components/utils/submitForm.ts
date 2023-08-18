export function submitForm(form: HTMLFormElement | null | undefined) {
  if (form) {
    if (typeof form.requestSubmit === 'function') {
      form.requestSubmit()
    } else {
      form.dispatchEvent(new Event('submit', { cancelable: true }))
    }
  }
}
