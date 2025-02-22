defmodule Console.Services.Base do
  alias Console.GraphQl.Topic

  defmacro __using__(_) do
    quote do
      import Console.Services.Base
      import Console, only: [coalesce: 2]
      alias Console.Repo
    end
  end

  def merge_bindings(attrs, resource, types) do
    Enum.reduce(types, attrs, fn type, attrs ->
      attr_bindings = Map.get(attrs, type) || []
      resource_bindings = Map.get(resource, type) || []

      merged = Enum.uniq_by(
        attr_bindings ++ resource_bindings,
        & "#{Map.get(&1, :user_id)}:#{Map.get(&1, :group_id)}"
      )
      Map.put(attrs, type, Console.mapify(merged))
    end)
  end

  def ok(val), do: {:ok, val}

  def bang!({:ok, val}), do: val
  def bang!({:error, reason}), do: raise(ArgumentError, message: inspect(reason))

  def should_cache?({:error, _}), do: false
  def should_cache?(nil), do: false
  def should_cache?(_), do: true

  def start_transaction(), do: Ecto.Multi.new()

  def short_circuit(), do: []

  def short(circuit, name, fun) when is_list(circuit) and is_function(fun),
    do: [{name, fun} | circuit]

  def add_operation(multi, name, fun) when is_function(fun) do
    Ecto.Multi.run(multi, name, fn _, params ->
      fun.(params)
    end)
  end

  def execute(operation, opts \\ [])
  def execute(%Ecto.Multi{} = multi, opts) do
    with {:ok, result} <- Console.Repo.transaction(multi, opts) do
      case Map.new(opts) do
        %{extract: operation} -> {:ok, result[operation]}
        _ -> {:ok, result}
      end
    else
      {:error, _, reason, _} -> {:error, reason}
      {:error, reason} -> {:error, reason}
    end
  end
  def execute(circuit, _) when is_list(circuit) do
    Enum.reverse(circuit)
    |> execute_short_circuit(%{})
  end

  defp execute_short_circuit([], result), do: {:ok, result}
  defp execute_short_circuit([{name, fun} | rest], result) do
    case fun.() do
      {:ok, res} -> execute_short_circuit(rest, Map.put(result, name, res))
      :ok -> execute_short_circuit(rest, result)
      {:error, _} = error -> error
    end
  end

  def broadcast(resource, delta) do
    topic = Topic.infer(resource, delta)
    :ok = Absinthe.Subscription.publish(
      ConsoleWeb.Endpoint,
      %{payload: resource, delta: delta},
      topic
    )
    resource
  end

  def when_ok({:ok, resource}, :insert), do: Console.Repo.insert(resource)
  def when_ok({:ok, resource}, :update), do: Console.Repo.update(resource)
  def when_ok({:ok, resource}, :delete), do: Console.Repo.delete(resource)
  def when_ok({:ok, resource}, fun) when is_function(fun) do
    case fun.(resource) do
      {:ok, res} -> {:ok, res}
      {:error, error} -> {:error, error}
      res -> {:ok, res}
    end
  end
  def when_ok(error, _), do: error

  def notify_after(timeout, event_type, resource, additional \\ %{}) do
    event = build_event(event_type, resource, additional)
    :timer.apply_after(timeout, Console.PubSub.Broadcaster, :notify, [event])
    {:ok, resource}
  end

  def handle_notify(event_type, resource, additional \\ %{}) do
    build_event(event_type, resource, additional)
    |> Console.PubSub.Broadcaster.notify()
    |> case do
      :ok   -> {:ok, resource}
      _error -> {:error, :internal_error}
    end
  end

  defp build_event(event, resource, additional) do
    Map.new(additional)
    |> Map.put(:item, resource)
    |> Map.put(:context, Console.Services.Audits.context())
    |> Map.put(:source_pid, self())
    |> event.__struct__()
  end

  def timestamped(map) do
    map
    |> Map.put(:inserted_at, DateTime.utc_now())
    |> Map.put(:updated_at, DateTime.utc_now())
  end

  def add_binding(bindings, key, value) do
    case Enum.find(bindings, &Map.get(&1, key) == value) do
      nil -> [%{key => value} | bindings]
      _ -> bindings
    end
    |> Console.mapify()
  end
end
