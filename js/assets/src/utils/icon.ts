export const iconUrl = (
  icon: Nullable<string>,
  darkIcon: Nullable<string>,
  mode: 'dark' | 'light'
) => (mode === 'dark' ? (darkIcon ?? icon) : icon) ?? undefined
