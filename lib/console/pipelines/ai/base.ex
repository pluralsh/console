defmodule Console.Pipelines.AI.Base do
  @moduledoc """
  Base module for AI pipelines.
  """
  import Console.Services.Base, only: [handle_notify: 2]
  alias Console.Repo
  alias Console.AI.{Worker, Memoizer}
  alias Console.Deployments.Settings
  alias Console.Schema.DeploymentSettings

  require Logger

  def process_insights(res, event) do
    Worker.generate(res)
    |> Worker.await()
    |> case do
      {:ok, insight} -> handle_notify(event, {res, insight})
      err ->
        Logger.warn("failed to generate insight for #{res.__struct__}{id: #{res.id}}, reason: #{inspect(err)}")
        bump_poll(res)
        :ok
    end
  end

  def if_enabled(fun) do
    case Settings.local_cached() do
      %DeploymentSettings{ai: %{enabled: true}} ->
        fun.()
      _ -> []
    end
  end

  defp bump_poll(%schema{} = model) do
    schema.changeset(model, %{ai_poll_at: Memoizer.next_poll_at()})
    |> Repo.update()
  end
end
