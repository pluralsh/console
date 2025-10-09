defmodule Console.Pipelines.Sentinel.Producer do
  use Console.Pipelines.PollProducer
  import Console.Services.Base, only: [ok: 1, start_transaction: 0, add_operation: 3, execute: 2]
  alias Console.Schema.SentinelRun
  require Logger

  def poll(demand) do
    start_transaction()
    |> add_operation(:fetch, fn _ ->
      SentinelRun.unpolled()
      |> SentinelRun.with_lock()
      |> SentinelRun.ordered(asc: :inserted_at)
      |> SentinelRun.with_limit(limit(demand))
      |> Repo.all()
      |> ok()
    end)
    |> add_operation(:update, fn
      %{fetch: [_ | _] = runs} ->
        Enum.map(runs, & &1.id)
        |> SentinelRun.for_ids()
        |> SentinelRun.selected()
        |> Repo.update_all(set: [polled_at: DateTime.utc_now()])
        |> elem(1)
        |> ok()
      _ -> {:ok, []}
    end)
    |> execute(extract: :update)
    |> case do
      {:ok, runs} -> runs
      {:error, err} ->
        Logger.error("failed to update sentinel runs: #{inspect(err)}")
        []
    end
  end
end
