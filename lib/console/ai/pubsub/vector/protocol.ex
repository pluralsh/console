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

defmodule Console.AI.PubSub.Vectorizable.Stack do
  alias Console.Schema.{StackState, Stack}
  alias Console.AI.PubSub.Vector.Indexable

  def indexable(%StackState{state: [_ | _] = items} = state, %Stack{} = stack) do
    minis =
      Enum.reject(items, &String.starts_with?(&1.identifier, "data."))
      |> Enum.map(&StackState.Mini.new(%{state | stack: stack}, &1))
    [
      %Indexable{delete: true, force: true, filters: [stack_id: stack.id, datatype: {:raw, :stack_state}]},
      %Indexable{data: minis, filters: [stack_id: stack.id], force: true}
    ]
  end

  def indexable(_, _), do: :ok
end

defimpl Console.AI.PubSub.Vectorizable, for: Console.PubSub.StackUpdated do
  alias Console.Repo
  alias Console.Schema.{StackState, Stack}
  alias Console.AI.PubSub.Vector.Indexable
  alias Console.AI.PubSub.Vectorizable.Stack, as: StackUtils
  require Logger

  @final ~w(successful failed)a

  def resource(%@for{item: %Stack{status: s} = stack}) when s in @final do
    case Repo.preload(stack, [:state, :repository]) do
      %Stack{state: %StackState{} = state} = stack ->
        StackUtils.indexable(state, stack)
      _ -> :ok
    end
  end
  def resource(_), do: :ok
end

defimpl Console.AI.PubSub.Vectorizable, for: Console.PubSub.StackRunCompleted do
  alias Console.AI.PubSub.Vector.Indexable
  alias Console.Schema.{Stack, StackRun, StackState}
  alias Console.AI.PubSub.Vectorizable.Stack, as: StackUtils
  require Logger

  def resource(%@for{item: %StackRun{status: :successful, id: id} = run}) do
    case Console.Repo.preload(run, [stack: [:state, :repository]]) do
      %StackRun{stack: %Stack{delete_run_id: ^id}} ->
        %Indexable{delete: true, filters: [stack_id: run.stack_id, datatype: {:raw, :stack_state}]}
      %StackRun{stack: %Stack{state: %StackState{} = state} = stack} ->
        StackUtils.indexable(state, stack)
      _ -> :ok
    end
  end
  def resource(_), do: :ok
end

defimpl Console.AI.PubSub.Vectorizable, for: Console.PubSub.ServiceComponentsUpdated do
  alias Console.Schema.{ServiceComponent, Service}
  alias Console.AI.PubSub.Vector.Indexable

  def resource(%@for{item: %Service{} = service}) do
    case Console.Repo.preload(service, [:repository, :cluster, :components]) do
      %Service{components: [_ | _] = components} = service ->
        minis = Enum.map(components, &ServiceComponent.Mini.new(%{&1 | service: service}))
                |> Enum.sort_by(& {&1.group, &1.version, &1.kind, &1.namespace, &1.name})
        Console.debounce({:vectorizer, :components, :erlang.phash2(minis)}, fn ->
          [
            %Indexable{delete: true, force: true, filters: [service_id: service.id, datatype: {:raw, :service_component}]},
            %Indexable{data: minis, filters: [service_id: service.id], force: true}
          ]
        end)
      _ -> :ok
    end
  end
  def resource(_), do: :ok
end
