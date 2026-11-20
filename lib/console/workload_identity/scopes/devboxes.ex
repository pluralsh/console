defmodule Console.WorkloadIdentity.Scopes.Devboxes do
  @moduledoc """
  The `devboxes` workload identity scope: one issuer per box, subject `devbox:<box-name>`, audiences for AWS STS, GCP
  workload identity federation providers and Entra ID token exchange, tokens of 10 minutes (at most an hour).
  """
  @behaviour Console.WorkloadIdentity.Scope
  alias Console.Schema.Devbox

  @aws "sts.amazonaws.com"
  @azure "api://AzureADTokenExchange"
  @gcp ~r{^(https:)?//iam\.googleapis\.com/projects/[0-9]+/locations/global/workloadIdentityPools/[a-z0-9-]+/providers/[a-z0-9-]+$}
  @claims ~w(instance workbench user repositories https://aws.amazon.com/tags)

  def type(), do: "devboxes"

  @impl true
  def subject?(scope_id, "devbox:" <> name) do
    case Console.Repo.get(Devbox, scope_id) do
      %Devbox{name: ^name} -> true
      _ -> false
    end
  end
  def subject?(_, _), do: false

  @impl true
  def audience?(@aws), do: true
  def audience?(@azure), do: true
  def audience?(aud), do: Regex.match?(@gcp, aud)

  @impl true
  def claims(), do: @claims

  @impl true
  def default_ttl(), do: 10 * 60

  @impl true
  def max_ttl(), do: 60 * 60

  @spec subject(Devbox.t) :: binary
  def subject(%Devbox{name: name}), do: "devbox:#{name}"

  @doc """
  The token audience for one of a box's cloud identities.
  """
  @spec audience(Devbox.CloudIdentity.t | map) :: binary | nil
  def audience(%{provider: :aws}), do: @aws
  def audience(%{provider: :azure}), do: @azure
  def audience(%{provider: :gcp, workload_identity_provider: "//" <> _ = provider}), do: provider
  def audience(%{provider: :gcp, workload_identity_provider: "projects/" <> _ = provider}), do: "//iam.googleapis.com/#{provider}"
  def audience(_), do: nil

  def aws_audience(), do: @aws
  def azure_audience(), do: @azure
end
