defmodule Console.Pipelines.AI.Base do
  @moduledoc """
  Base module for AI pipelines.
  """
  import Console.Services.Base, only: [handle_notify: 2]
  alias Console.AI.Worker
  alias Console.Deployments.Settings
  alias Console.Schema.DeploymentSettings

  def process_insights(flow, event) do
    flow
    |> Flow.map(& {&1, Worker.generate(&1)})
    |> Flow.map(fn {res, t} -> {res, Worker.await(t)} end)
    |> Flow.map(fn
      {res, {:ok, insight}} ->
        handle_notify(event, {res, insight})
      _ -> :ok
    end)
  end

  def if_enabled(fun) do
    case Settings.cached() do
      %DeploymentSettings{ai: %{enabled: true}} ->
        fun.()
      _ -> []
    end
  end
end
