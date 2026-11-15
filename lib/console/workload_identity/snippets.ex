defmodule Console.WorkloadIdentity.Snippets do
  @moduledoc """
  Copyable Terraform and CLI snippets that set up a cloud account's trust in a devbox's issuer (DBX-55): an AWS IAM
  OIDC provider and role trust policy, a GCP workload identity pool, provider and service account binding, and an
  Entra ID federated credential.
  """
  alias Console.Schema.Devbox
  alias Console.WorkloadIdentity
  alias Console.WorkloadIdentity.Scopes.Devboxes

  @type snippet :: %{provider: atom, format: atom, title: binary, content: binary}

  @doc """
  The issuer url, subject, audiences and setup snippets for a box.  Identity-specific values (role, provider, client
  id) come from the box's cloud identities where it has them, placeholders otherwise.
  """
  @spec devbox(Devbox.t) :: map
  def devbox(%Devbox{} = devbox) do
    issuer = WorkloadIdentity.issuer_url(Devboxes.type(), devbox.id)
    sub = Devboxes.subject(devbox)
    ids = devbox.cloud_identities || []
    aws = Enum.find(ids, & &1.provider == :aws)
    gcp = Enum.find(ids, & &1.provider == :gcp)
    azure = Enum.find(ids, & &1.provider == :azure)
    host = String.replace_prefix(issuer, "https://", "")

    %{
      issuer_url: issuer,
      subject: sub,
      audiences: Enum.uniq([Devboxes.aws_audience(), Devboxes.azure_audience()] ++ Enum.flat_map(ids, &List.wrap(Devboxes.audience(&1)))),
      snippets: aws(issuer, host, sub, aws) ++ gcp(issuer, sub, devbox, gcp) ++ azure(issuer, sub, devbox, azure)
    }
  end

  defp aws(issuer, host, sub, identity) do
    role = role_name(identity)
    [
      %{provider: :aws, format: :terraform, title: "AWS IAM OIDC provider and role", content: """
      resource "aws_iam_openid_connect_provider" "devbox" {
        url            = "#{issuer}"
        client_id_list = ["sts.amazonaws.com"]
      }

      data "aws_iam_policy_document" "devbox_trust" {
        statement {
          actions = ["sts:AssumeRoleWithWebIdentity", "sts:TagSession"]
          principals {
            type        = "Federated"
            identifiers = [aws_iam_openid_connect_provider.devbox.arn]
          }
          condition {
            test     = "StringEquals"
            variable = "#{host}:aud"
            values   = ["sts.amazonaws.com"]
          }
          condition {
            test     = "StringEquals"
            variable = "#{host}:sub"
            values   = ["#{sub}"]
          }
        }
      }

      resource "aws_iam_role" "devbox" {
        name               = "#{role}"
        assume_role_policy = data.aws_iam_policy_document.devbox_trust.json
      }
      """},
      %{provider: :aws, format: :cli, title: "AWS CLI", content: """
      aws iam create-open-id-connect-provider \\
        --url #{issuer} \\
        --client-id-list sts.amazonaws.com

      cat > devbox-trust.json <<EOF
      {
        "Version": "2012-10-17",
        "Statement": [{
          "Effect": "Allow",
          "Principal": {"Federated": "arn:aws:iam::<account-id>:oidc-provider/#{host}"},
          "Action": ["sts:AssumeRoleWithWebIdentity", "sts:TagSession"],
          "Condition": {"StringEquals": {"#{host}:aud": "sts.amazonaws.com", "#{host}:sub": "#{sub}"}}
        }]
      }
      EOF
      aws iam create-role --role-name #{role} --assume-role-policy-document file://devbox-trust.json
      """}
    ]
  end

  defp gcp(issuer, sub, devbox, identity) do
    {project, pool, provider} = gcp_names(devbox, identity)
    sa = (identity && identity.service_account) || "<service-account>@<project-id>.iam.gserviceaccount.com"
    [
      %{provider: :gcp, format: :terraform, title: "GCP workload identity pool, provider and binding", content: """
      resource "google_iam_workload_identity_pool" "devbox" {
        workload_identity_pool_id = "#{pool}"
      }

      resource "google_iam_workload_identity_pool_provider" "devbox" {
        workload_identity_pool_id          = google_iam_workload_identity_pool.devbox.workload_identity_pool_id
        workload_identity_pool_provider_id = "#{provider}"
        attribute_mapping = {
          "google.subject"      = "assertion.sub"
          "attribute.workbench" = "assertion.workbench"
          "attribute.user"      = "assertion.user"
        }
        attribute_condition = "assertion.sub == '#{sub}'"
        oidc {
          issuer_uri = "#{issuer}"
        }
      }

      resource "google_service_account_iam_member" "devbox" {
        service_account_id = "projects/#{project}/serviceAccounts/#{sa}"
        role               = "roles/iam.workloadIdentityUser"
        member             = "principal://iam.googleapis.com/${google_iam_workload_identity_pool.devbox.name}/subject/#{sub}"
      }
      """},
      %{provider: :gcp, format: :cli, title: "gcloud", content: """
      gcloud iam workload-identity-pools create #{pool} --location=global
      gcloud iam workload-identity-pools providers create-oidc #{provider} \\
        --location=global --workload-identity-pool=#{pool} \\
        --issuer-uri=#{issuer} \\
        --attribute-mapping="google.subject=assertion.sub,attribute.workbench=assertion.workbench,attribute.user=assertion.user" \\
        --attribute-condition="assertion.sub == '#{sub}'"
      gcloud iam service-accounts add-iam-policy-binding #{sa} \\
        --role=roles/iam.workloadIdentityUser \\
        --member="principal://iam.googleapis.com/projects/<project-number>/locations/global/workloadIdentityPools/#{pool}/subject/#{sub}"
      """}
    ]
  end

  defp azure(issuer, sub, devbox, identity) do
    app = (identity && identity.client_id) || "<application-client-id>"
    [
      %{provider: :azure, format: :terraform, title: "Entra ID federated credential", content: """
      resource "azuread_application_federated_identity_credential" "devbox" {
        application_id = "/applications/<application-object-id>"
        display_name   = "devbox-#{devbox.name}"
        issuer         = "#{issuer}"
        subject        = "#{sub}"
        audiences      = ["api://AzureADTokenExchange"]
      }
      """},
      %{provider: :azure, format: :cli, title: "Azure CLI", content: """
      az ad app federated-credential create --id #{app} --parameters '{
        "name": "devbox-#{devbox.name}",
        "issuer": "#{issuer}",
        "subject": "#{sub}",
        "audiences": ["api://AzureADTokenExchange"]
      }'
      """}
    ]
  end

  defp role_name(%{role_arn: "arn:" <> _ = arn}), do: arn |> String.split("/") |> List.last()
  defp role_name(_), do: "devbox"

  defp gcp_names(_, %{workload_identity_provider: wip}) when is_binary(wip) do
    case Regex.run(~r{projects/([0-9]+)/locations/global/workloadIdentityPools/([a-z0-9-]+)/providers/([a-z0-9-]+)}, wip) do
      [_, project, pool, provider] -> {project, pool, provider}
      _ -> {"<project-id>", "devboxes", "devbox"}
    end
  end
  defp gcp_names(%Devbox{name: name}, _), do: {"<project-id>", "devboxes", String.slice("devbox-#{name}", 0, 32)}
end
