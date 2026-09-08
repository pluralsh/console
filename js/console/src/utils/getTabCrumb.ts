export const getTabCrumb = (prefix: string, tab: Nullable<string>) =>
  tab ? [{ label: tab.split('-').join(' '), url: `${prefix}/${tab}` }] : []
