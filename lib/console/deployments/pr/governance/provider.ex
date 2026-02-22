defmodule Console.Deployments.Pr.Governance.Provider do
  @moduledoc """
  A provider for the pr governance controller
  """
  alias Console.Deployments.Pr.Governance.Impl.{Webhook, ServiceNow}
  alias Console.Schema.{PrGovernance, PullRequest}

  @callback open(PrGovernance.t, PullRequest.t) :: {:ok, map} | {:error, any}
  @callback close(PrGovernance.t, PullRequest.t) :: {:ok, map} | {:error, any}
  @callback confirm(PrGovernance.t, PullRequest.t) :: {:ok, map} | {:error, any}

  def open(%PullRequest{governance: %PrGovernance{} = gov} = pr) do
    with {:ok, provider} <- provider(gov),
      do: provider.open(gov, pr)
  end

  def close(%PullRequest{governance: %PrGovernance{} = gov} = pr) do
    with {:ok, provider} <- provider(gov),
      do: provider.close(gov, pr)
  end

  def confirm(%PullRequest{governance: %PrGovernance{} = gov} = pr) do
    with {:ok, provider} <- provider(gov),
      do: provider.confirm(gov, pr)
  end

  defp provider(%PrGovernance{type: :service_now, configuration: %{service_now: %{url: url}}}) when is_binary(url),
    do: {:ok, ServiceNow}
  defp provider(%PrGovernance{configuration: %{webhook: %{url: url}}}) when is_binary(url),
    do: {:ok, Webhook}
  defp provider(_), do: {:error, :not_implemented}
end
