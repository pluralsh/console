defprotocol Console.AI.PubSub.Vectorizable do
  @fallback_to_any true

  @spec resource(any) :: {:ok, struct} | :ok
  def resource(struct)
end

defimpl Console.AI.PubSub.Vectorizable, for: Any do
  def resource(_), do: :ok
end

defimpl Console.AI.PubSub.Vectorizable, for: [Console.PubSub.PullRequestCreated, Console.PubSub.PullRequestUpdated] do
  alias Console.AI.Tool
  alias Console.AI.PubSub.Vector.Indexable
  alias Console.Deployments.Pr.Dispatcher
  alias Console.Schema.{PullRequest, ScmConnection}

  def resource(%@for{item: %PullRequest{status: s, url: url, flow_id: flow_id}})
      when s in ~w(merged closed)a and is_binary(flow_id) do
    with %ScmConnection{} = conn <- Tool.scm_connection(),
         {:ok, files} <- Dispatcher.files(conn, url),
      do: %Indexable{data: files, filters: [flow_id: flow_id]}
  end

  def resource(_), do: :ok
end


defimpl Console.AI.PubSub.Vectorizable, for: Console.PubSub.AlertResolutionCreated do
  alias Console.Schema.{AlertResolution, Alert, Service}
  alias Console.AI.PubSub.Vector.Indexable

  def resource(%@for{item: resolution}) do
    res = Console.Repo.preload(resolution, [alert: :service])
    %Indexable{
      data: AlertResolution.Mini.new(res),
      filters: filters(res.alert)
    }
  end

  defp filters(%Alert{service: %Service{flow_id: f}}) when is_binary(f), do: [flow_id: f]
  defp filters(_), do: []
end

defimpl Console.AI.PubSub.Vectorizable, for: Console.PubSub.StackUpdated do
  alias Console.Repo
  alias Console.Schema.{StackState, Stack}
  alias Console.AI.PubSub.Vector.Indexable

  @final ~w(successful failed)a

  def resource(%@for{item: %Stack{status: s} = stack}) when s in @final do
    case Repo.preload(stack, [:state, :repository]) do
      %Stack{state: %StackState{state: [_ | _] = items} = state} = stack ->
        minis = Enum.map(items, &StackState.Mini.new(%{state | stack: stack}, &1))
        %Indexable{data: minis, filters: [stack_id: stack.id]}
      _ -> :ok
    end
  end
  def resource(_), do: :ok
end
