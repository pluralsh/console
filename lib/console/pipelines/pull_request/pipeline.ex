defmodule Console.Pipelines.PullRequest.Pipeline do
  use Console.Pipelines.Consumer
  require Logger
  alias Console.Deployments.Git

  def handle_event(pr) do
    Logger.info "Attempting pr auto merge for #{pr.url}"
    case Git.auto_merge(pr) do
      :ok -> :ok
      {:error, err} -> Logger.error "Failed to auto merge pr #{pr.url}: #{inspect(err)}"
      _ -> Logger.error "scm integration not set up to perform auto merge"
    end
  end
end
