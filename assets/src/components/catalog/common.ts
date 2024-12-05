export const catalogImageUrl = (
  icon: Nullable<string>,
  darkIcon: Nullable<string>,
  mode: 'dark' | 'light'
) => (mode === 'dark' ? (darkIcon ?? icon) : icon) ?? undefined
