defprotocol Console.AI.PubSub.Insightful do
  @fallback_to_any true

  @spec resource(any) :: {:ok, struct} | :ok
  def resource(struct)
end

defimpl Console.AI.PubSub.Insightful, for: Any do
  def resource(_), do: :ok
end

defimpl Console.AI.PubSub.Insightful, for: Console.PubSub.ServiceUpdated do
  alias Console.Schema.Service

  def resource(%@for{item: %Service{status: s} = svc}) when s in ~w(stale failed)a do
    Console.debounce({:insight, svc.id}, fn ->
      Timex.now()
      |> Timex.shift(minutes: -10)
      |> Timex.after?(svc.updated_at || svc.inserted_at)
      |>  case do
        true -> {:ok, svc}
        _ -> :ok
      end
    end)
  end
  def resource(_), do: :ok
end

defimpl Console.AI.PubSub.Insightful, for: Console.PubSub.StackRunUpdated do
  alias Console.Schema.{StackRun, StackState}

  def resource(%@for{item: %StackRun{status: :pending_approval} = run}),
    do: get_state(run)
  def resource(%@for{item: %StackRun{status: :successful, pull_request_id: id} = run}) when is_binary(id),
    do: get_state(run)
  def resource(_), do: :ok

  defp get_state(run) do
    case Console.Repo.preload(run, [:state]) do
      %StackRun{state: %StackState{plan: p} = state} when is_binary(p) and byte_size(p) > 0 ->
        {:ok, state}
      _ -> :ok
    end
  end
end

defimpl Console.AI.PubSub.Insightful, for: Console.PubSub.StackRunCompleted do
  alias Console.Schema.{StackState, StackRun}

  def resource(%@for{item: %StackRun{status: :successful, pull_request_id: id} = run}) when is_binary(id) do
    case Console.Repo.preload(run, [:state]) do
      %StackRun{state: %StackState{plan: p} = state} when is_binary(p) and byte_size(p) > 0 ->
        {:ok, state}
      _ -> :ok
    end
  end
  def resource(%@for{item: %StackRun{status: :failed} = run}), do: {:ok, run}
  def resource(_), do: :ok
end

defimpl Console.AI.PubSub.Insightful, for: Console.PubSub.StackUpdated do
  alias Console.Schema.Stack
  def resource(%@for{item: %Stack{status: :failed} = stack}), do: {:ok, stack}
  def resource(_), do: :ok
end

defimpl Console.AI.PubSub.Insightful, for: Console.PubSub.AlertCreated do
  alias Console.Schema.Alert
  def resource(%@for{item: %Alert{state: :firing} = alert}), do: {:ok, alert}
  def resource(_), do: :ok
end
