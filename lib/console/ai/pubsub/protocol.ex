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

defimpl Console.AI.PubSub.Insightful, for: Console.PubSub.StackRunCompleted do
  alias Console.Schema.StackRun
  def resource(%@for{item: %StackRun{status: :failed} = run}), do: {:ok, run}
  def resource(_), do: :ok
end

defimpl Console.AI.PubSub.Insightful, for: Console.PubSub.StackUpdated do
  alias Console.Schema.Stack
  def resource(%@for{item: %Stack{status: :failed} = stack}), do: {:ok, stack}
  def resource(_), do: :ok
end
