import { DevboxFragment } from 'generated/graphql'

export type DevboxIssuer = {
  url: string
  subject: string
  audiences?: Nullable<Nullable<string>[]>
  // console's own snippets, preferred over the generated fallbacks
  snippets?: DevboxTrustSnippetFragment[]
}

type DevboxTrustSnippetFragment = NonNullable<
  NonNullable<
    NonNullable<DevboxFragment['workloadIdentity']>['snippets']
  >[number]
>

export type DevboxTrustSnippet = {
  cloud: 'aws' | 'gcp' | 'azure'
  label: string
  terraform: string
  cli: string
}

const host = (url: string) => url.replace(/^https?:\/\//, '').replace(/\/$/, '')

// copyable trust setup per cloud, matched on the box's stable `sub`
export function devboxTrustSnippets(
  issuer: DevboxIssuer,
  boxName: string
): DevboxTrustSnippet[] {
  const iss = issuer.url.replace(/\/$/, '')
  const sub = issuer.subject
  const slug = boxName.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase()

  return [
    {
      cloud: 'aws',
      label: 'AWS IAM',
      terraform: `resource "aws_iam_openid_connect_provider" "devbox_${slug.replace(/-/g, '_')}" {
  url            = "${iss}"
  client_id_list = ["sts.amazonaws.com"]
}

resource "aws_iam_role" "devbox_${slug.replace(/-/g, '_')}" {
  name = "devbox-${slug}"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Action    = ["sts:AssumeRoleWithWebIdentity", "sts:TagSession"]
      Principal = { Federated = aws_iam_openid_connect_provider.devbox_${slug.replace(/-/g, '_')}.arn }
      Condition = {
        StringEquals = {
          "${host(iss)}:aud" = "sts.amazonaws.com"
          "${host(iss)}:sub" = "${sub}"
        }
      }
    }]
  })
}`,
      cli: `aws iam create-open-id-connect-provider \\
  --url ${iss} \\
  --client-id-list sts.amazonaws.com`,
    },
    {
      cloud: 'gcp',
      label: 'GCP Workload Identity Federation',
      terraform: `resource "google_iam_workload_identity_pool" "devboxes" {
  workload_identity_pool_id = "plural-devboxes"
}

resource "google_iam_workload_identity_pool_provider" "devbox_${slug.replace(/-/g, '_')}" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.devboxes.workload_identity_pool_id
  workload_identity_pool_provider_id = "devbox-${slug}"
  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.workbench"  = "assertion.workbench"
    "attribute.instance"   = "assertion.instance"
  }
  attribute_condition = "assertion.sub == '${sub}'"
  oidc {
    issuer_uri = "${iss}"
  }
}

resource "google_service_account_iam_member" "devbox_${slug.replace(/-/g, '_')}" {
  service_account_id = google_service_account.devbox.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principal://iam.googleapis.com/\${google_iam_workload_identity_pool.devboxes.name}/subject/${sub}"
}`,
      cli: `gcloud iam workload-identity-pools providers create-oidc devbox-${slug} \\
  --location=global \\
  --workload-identity-pool=plural-devboxes \\
  --issuer-uri=${iss} \\
  --attribute-mapping=google.subject=assertion.sub \\
  --attribute-condition="assertion.sub == '${sub}'"`,
    },
    {
      cloud: 'azure',
      label: 'Entra ID federated credential',
      terraform: `resource "azuread_application_federated_identity_credential" "devbox_${slug.replace(/-/g, '_')}" {
  application_id = azuread_application.devbox.id
  display_name   = "devbox-${slug}"
  issuer         = "${iss}"
  subject        = "${sub}"
  audiences      = ["api://AzureADTokenExchange"]
}`,
      cli: `az ad app federated-credential create --id <app-id> --parameters '{
  "name": "devbox-${slug}",
  "issuer": "${iss}",
  "subject": "${sub}",
  "audiences": ["api://AzureADTokenExchange"]
}'`,
    },
  ]
}
