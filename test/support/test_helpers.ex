defmodule Console.TestHelpers do
  import Console.Factory
  alias Console.Schema.{Cluster, Service}
  alias Console.Deployments.Services

  @es_host Application.compile_env(:elasticsearch, :host)
  @es_index Application.compile_env(:elasticsearch, :index)

  def deployment_settings(args \\ []) do
    Console.Cache.flush()
    insert(:deployment_settings, args)
  end

  def es_settings(), do: %{host: @es_host, index: @es_index}

  def create_service(attrs, %Cluster{} = cluster, user), do: create_service(cluster, user, attrs)
  def create_service(%Cluster{id: id}, user, attrs), do: Services.create_service(Map.new(attrs), id, user)

  def update_service(attrs, %Service{id: id}, user), do: Services.update_service(attrs, id, user)

  def unordered_equal?(found, expected) do
    found    = MapSet.new(found)
    expected = MapSet.new(expected)
    MapSet.equal?(found, expected)
  end

  def ids_equal(found, expected) do
    found = MapSet.new(ids(found))
    expected = MapSet.new(ids(expected))

    MapSet.equal?(found, expected)
  end

  def by_ids(models) do
    Enum.into(models, %{}, & {id(&1), &1})
  end

  def ids(list) do
    Enum.map(list, &id/1)
  end

  def wait(query, valid, elapsed \\ 0)
  def wait(_, _, elapsed) when elapsed > 5_000, do: :error
  def wait(query, valid, elapsed) do
    res = query.()
    case valid.(res) do
      true -> {:ok, res}
      _ ->
        :timer.sleep(200)
        wait(query, valid, elapsed + 200)
    end
  end

  def id(%{id: id}), do: id
  def id(%{"id" => id}), do: id
  def id(id) when is_binary(id), do: id

  def refetch(%{__struct__: schema, id: id}), do: Console.Repo.get(schema, id)

  def update_record(model, attrs) do
    Ecto.Changeset.change(model, attrs)
    |> Console.Repo.update()
  end

  def run_query(query, variables, context \\ %{}),
    do: Absinthe.run(query, Console.GraphQl, variables: variables, context: context)

  def expect_reqllm_completion(fun) when is_function(fun, 2) do
    Mimic.expect(Console.AI.Provider, :reqllm_completion, fn context, opts ->
      opts = Keyword.put(opts, :preface, system_prompt(context))

      context
      |> legacy_history()
      |> fun.(opts)
      |> reqllm_response(context)
    end)
  end

  def log_line(log), do: %Console.Logs.Line{timestamp: Timex.now(), log: log}

  def from_connection(%{"edges" => edges}), do: Enum.map(edges, & &1["node"])

  defp reqllm_response({:ok, content}, context) when is_binary(content),
    do: response(context, ReqLLM.Context.assistant(content), :stop)

  defp reqllm_response({:ok, content, calls}, context)
       when is_binary(content) and is_list(calls) do
    tool_calls =
      Enum.map(calls, fn %Console.AI.Tool{id: id, name: name, arguments: arguments} ->
        ReqLLM.ToolCall.new(id || Ecto.UUID.generate(), name, Jason.encode!(arguments))
      end)

    response(context, ReqLLM.Context.assistant(content, tool_calls: tool_calls), :tool_calls)
  end

  defp reqllm_response(error, _context), do: error

  defp response(context, message, finish_reason) do
    response = %ReqLLM.Response{
      id: Ecto.UUID.generate(),
      model: "test:model",
      context: context,
      message: message,
      finish_reason: finish_reason,
      stream?: false
    }

    {:ok, ReqLLM.Context.merge_response(context, response)}
  end

  defp legacy_history(%ReqLLM.Context{messages: messages}) do
    Enum.flat_map(messages, fn
      %ReqLLM.Message{role: :system} = message -> [{:system, message_text(message)}]
      %ReqLLM.Message{role: :user} = message -> [{:user, message_text(message)}]
      %ReqLLM.Message{role: :assistant} = message ->
        case message_text(message) do
          "" -> []
          content -> [{:assistant, content}]
        end
      %ReqLLM.Message{role: :tool, tool_call_id: id, name: name} = message ->
        [{:tool, message_text(message), %{call_id: id, name: name, arguments: %{}}}]
    end)
  end

  defp system_prompt(%ReqLLM.Context{messages: messages}) do
    Enum.find_value(messages, fn
      %ReqLLM.Message{role: :system} = message -> message_text(message)
      _ -> nil
    end)
  end

  defp message_text(%ReqLLM.Message{content: content}) do
    Enum.map_join(content || [], "", fn
      %{type: :text, text: text} when is_binary(text) -> text
      _ -> ""
    end)
  end
end
