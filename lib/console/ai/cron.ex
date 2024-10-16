defmodule Console.AI.Cron do
  import Console.Services.Base, only: [handle_notify: 2]
  alias Console.{Repo, PubSub}
  alias Console.AI.Worker
  alias Console.Deployments.Settings
  alias Console.Schema.{AiInsight, Service, DeploymentSettings}

  require Logger

  def trim() do
    AiInsight.expired()
    |> Repo.delete_all()
  end

  def services() do
    if_enabled(fn ->
      Service.for_statuses([:failed, :stale])
      |> Service.ordered(asc: :id)
      |> Repo.stream(method: :keyset)
      |> Console.throttle()
      |> Stream.chunk_every(20)
      |> Stream.map(fn chunk ->
        Enum.map(chunk, & {&1, Worker.generate(&1)})
        |> Enum.map(fn {svc, t} -> {svc, Worker.await(t)} end)
        |> Enum.map(fn
          {svc, {:ok, insight}} ->
            handle_notify(PubSub.ServiceInsight, {svc, insight})
          res ->
            Logger.info "not sending event for result: #{inspect(res)}"
        end)
      end)
      |> Stream.run()
    end)
  end

  defp if_enabled(fun) do
    case Settings.cached() do
      %DeploymentSettings{ai: %{enabled: true}} ->
        fun.()
      _ -> :ok
    end
  end
end
