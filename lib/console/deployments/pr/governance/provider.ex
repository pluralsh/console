defmodule Console.Deployments.Pr.Governance.Provider do
  @moduledoc """
  A provider for the pr governance controller
  """
  alias Console.Deployments.Pr.Governance.Impl.Webhook
  alias Console.Schema.{PrGovernance, PullRequest}

  @callback open(PrGovernance.t, PullRequest.t) :: {:ok, map} | {:error, any}
  @callback close(PrGovernance.t, PullRequest.t) :: {:ok, map} | {:error, any}
  @callback confirm(PrGovernance.t, PullRequest.t) :: {:ok, map} | {:error, any}

  def open(%PullRequest{governance: %PrGovernance{} = gov} = pr) do
    provider(gov).open(gov, pr)
  end

  def close(%PullRequest{governance: %PrGovernance{} = gov} = pr) do
    provider(gov).close(gov, pr)
  end

  def confirm(%PullRequest{governance: %PrGovernance{} = gov} = pr) do
    provider(gov).confirm(gov, pr)
  end

  defp provider(%PrGovernance{configuration: %{webhook: %{url: url}}}) when is_binary(url),
    do: Webhook
end
