defmodule Console.Pipelines.PrGovernance.Pipeline do
  use Console.Pipelines.Consumer
  require Logger
  alias Console.Deployments.Git

  def handle_event(pr) do
    Logger.info "Attempting pr auto merge for #{pr.url}"
    case Git.confirm_pull_request(pr) do
      :ok -> :ok
      {:ok, _} -> :ok
      {:error, err} -> Logger.info "Failed to auto merge pr #{pr.url}: #{inspect(err)}"
      _ -> Logger.info "scm integration not set up to perform auto merge"
    end
    |> mark_polled(pr)
  end

  defp mark_polled(result, pr) do
    Git.governance_poll(pr)
    result
  end
end
