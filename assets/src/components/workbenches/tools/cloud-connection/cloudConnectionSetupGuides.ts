import { Provider } from 'generated/graphql'

const CLOUD_CONNECTION_SETUP_GUIDE_PATHS: Record<Provider, string> = {
  [Provider.Aws]: '/setup-guides/cloud-connections/aws.md',
  [Provider.Gcp]: '/setup-guides/cloud-connections/gcp.md',
  [Provider.Azure]: '/setup-guides/cloud-connections/azure.md',
}

const CLOUD_CONNECTION_SETUP_GUIDE_DOC_URLS: Record<Provider, string> = {
  [Provider.Aws]:
    'https://docs.aws.amazon.com/IAM/latest/UserGuide/tutorial_cross-account-with-roles.html',
  [Provider.Gcp]: 'https://cloud.google.com/iam/docs/service-account-overview',
  [Provider.Azure]:
    'https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles#reader',
}

export function getCloudConnectionSetupGuideMarkdownPath(provider: Provider) {
  return CLOUD_CONNECTION_SETUP_GUIDE_PATHS[provider]
}

export function getCloudConnectionSetupGuideDocumentationUrl(
  provider: Provider
) {
  return CLOUD_CONNECTION_SETUP_GUIDE_DOC_URLS[provider]
}
