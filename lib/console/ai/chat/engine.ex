defmodule Console.AI.Chat.Engine do
  use Console.Services.Base
  import Console.GraphQl.Helpers, only: [resolve_changeset: 1]
  import Console.AI.Evidence.Base, only: [append: 2]
  import Console.AI.Chat.System
  alias Console.Schema.{
    Chat,
    Chat.Attributes,
    ChatThread,
    AgentSession,
    Flow,
    User,
    McpServer,
    McpServerAudit
  }
  alias Console.AI.{Provider, Tool, Stream}
  alias Console.AI.MCP.{Discovery, Agent}
  alias Console.AI.Chat, as: ChatSvc
  alias Console.AI.Chat.Tools
  require Logger

  @spec call_tool(Chat.t, User.t) :: {:ok, Chat.t} | {:error, term}
  def call_tool(
    %Chat{confirm: true, attributes: %Attributes{tool: %Attributes.ToolAttributes{name: name, arguments: args}}} = chat,
    %User{} = user
  ) do
    %Chat{server: mcp_server} = chat =
      Repo.preload(chat, [:server, thread: [flow: :servers, user: :groups]])

    start_transaction()
    |> add_operation(:call, fn _ ->
      call_tool(
        %Tool{name: Agent.tool_name(mcp_server.name, name), arguments: args},
        chat.thread,
        mcp_server,
        user
      )
    end)
    |> add_operation(:chat, fn %{call: content} ->
      chat
      |> Chat.changeset(%{content: content, confirmed_at: Timex.now()})
      |> Repo.update()
    end)
    |> execute(extract: :chat)
  end
  def call_tool(_, _), do: {:error, "this chat cannot be confirmed"}

  @recursive_limit 8

  @doc"""
  This will run a sequence of completions in a row gathering tools so users don't have to drive the RAG process manually.

  Automatically cuts off at a depth of three to avoid runaway scenarios.
  """
  @spec completion(Provider.history, ChatThread.t, User.t, Chat.history, integer) :: {:ok, Chat.t} | {:ok, [Chat.t]} | Console.error
  def completion(messages, thread, user, completion \\ [], level \\ 0)
  def completion(_, %ChatThread{id: thread_id}, %User{} = user, completion, @recursive_limit) do
    completion
    |> Enum.map(&Chat.attributes/1)
    |> ChatSvc.save_messages(thread_id, user)
  end

  def completion(messages, %ChatThread{id: thread_id} = thread, %User{} = user, completion, level) do
    preface = prompt(thread)

    thread = current_thread(thread)
    opts = include_tools([preface: preface], thread)
    Enum.concat(messages, completion)
    |> Enum.map(&Chat.message/1)
    |> Enum.filter(& &1)
    |> fit_context_window(preface)
    |> Provider.completion(opts)
    |> case do
      {:ok, content} ->
        append(completion, {:assistant, content})
        |> Enum.map(&Chat.attributes/1)
        |> ChatSvc.save_messages(thread_id, user)
      {:ok, content, tools} ->
        {plural, mcp} = Enum.split_with(tools, &String.starts_with?(&1.name, "__plrl__"))
        with {:ok, plrl_res} <- call_plrl_tools(plural, opts[:plural]),
             {:ok, mcp_res} <- call_mcp_tools(mcp, thread, user) do
          completion = completion ++ tool_msgs(content, mcp_res ++ plrl_res)
          Enum.any?(completion, fn
            %{confirm: true} -> true
            _ -> false
          end)
          |> case do
            true ->
              completion
              |> Enum.map(&Chat.attributes/1)
              |> Enum.filter(&persist?/1)
              |> ChatSvc.save_messages(thread_id, user)
            false ->
              completion(messages, thread, user, completion, level + 1)
          end
        else
          {:error, err, acc} when is_list(acc) ->
            (completion ++ tool_msgs(content, acc) ++ [%{type: :error, content: err, role: :user}])
            |> Enum.map(&Chat.attributes/1)
            |> Enum.filter(&persist?/1)
            |> ChatSvc.save_messages(thread_id, user)
          err -> err
        end
      err -> err
    end
  end

  defp tool_msgs(content, tools) when is_binary(content) and byte_size(content) > 0,
    do: [{:assistant, content} | tools]
  defp tool_msgs(_, tools), do: tools

  @spec call_plrl_tools([Tool.t], [module]) :: {:ok, [%{role: Provider.sender, content: binary}]} | {:error, binary}
  defp call_plrl_tools(tools, impls) do
    by_name = Map.new(impls, & {&1.name(), &1})
    stream = Stream.stream(:user)
    Enum.reduce_while(tools, [], fn %Tool{id: id, name: name, arguments: args}, acc ->
      with {:ok, impl}    <- Map.fetch(by_name, name),
           _ <- Logger.info("calling tool: #{name} with args: #{inspect(args)}"),
           {:ok, parsed}  <- Tool.validate(impl, args),
           {:ok, content} <- impl.implement(parsed) do
        case tool_msg(content, id, nil, name, args) do
          [_ | _] = msgs ->
            Enum.each(msgs, fn %{content: content} ->
              publish_tool(stream, content, id, name)
            end)
            {:cont, Enum.concat(msgs, acc)}
          %{content: content} = msg ->
            publish_tool(stream, content, id, name)
            {:cont, [msg | acc]}
        end
      else
        :error ->
          {:halt, {:error, "failed to call tool: #{name}, tool not found", Enum.reverse(acc)}}
        {:error, %Ecto.Changeset{} = cs} ->
          {:cont, [tool_msg("failed to call tool: #{name}, errors: #{Enum.join(resolve_changeset(cs), ", ")}", id, nil, name, args) | acc]}
        err ->
          {:halt, {:error, "failed to call tool: #{name}, result: #{inspect(err)}", Enum.reverse(acc)}}
      end
    end)
    |> tool_results()
  end

  @spec call_mcp_tools([Tool.t], ChatThread.t, User.t) :: {:ok, [%{role: Provider.sender, content: binary}]} | {:error, binary}
  defp call_mcp_tools(tools, %ChatThread{} = thread, %User{} = user) do
    servers_by_name = Map.new(ChatSvc.servers(thread), & {&1.name, &1})
    stream = Stream.stream(:user)
    Enum.reduce_while(tools, [], fn %Tool{id: id, name: name, arguments: args} = tool, acc ->
      with {sname, tname} <- Agent.tool_name(name),
           {tname, %McpServer{confirm: false} = server} <- {tname, servers_by_name[sname]},
           {:ok, content} <- call_tool(tool, thread, server, user) do
        publish_tool(stream, content, id, name)
        {:cont, [tool_msg(content, id, server, tname, args) | acc]}
      else
        {tname, %McpServer{confirm: true} = server} ->
          msg = tool_msg(nil, id, server, tname, args)
                |> Map.put(:confirm, true)
          {:cont, [msg | acc]}
        {:error, err} -> {:halt, {:error, err}}
        _ -> {:halt, {:error, "tool calling error: invalid tool name #{name}"}}
      end
    end)
    |> tool_results()
  end

  @spec call_tool(Tool.t, ChatThread.t, McpServer.t, User.t) :: {:ok, binary} | {:error, binary}
  defp call_tool(%Tool{name: name, arguments: arguments}, thread, %McpServer{} = server, %User{} = user) do
    {_, tname} = Agent.tool_name(name)
    start_transaction()
    |> add_operation(:audit, fn _ ->
      %McpServerAudit{server_id: server.id, actor_id: user.id}
      |> McpServerAudit.changeset(%{tool: tname, arguments: arguments})
      |> Repo.insert()
    end)
    |> add_operation(:tool, fn _ ->
      case Discovery.invoke(thread, name, arguments) do
        {:ok, result} -> {:ok, result}
        {:error, err} -> {:error, "Internal tool call failure for tool #{name}: #{inspect(err)}"}
      end
    end)
    |> execute(extract: :tool)
  end

  @spec tool_msg(binary | map | [map], binary | nil, McpServer.t | nil, binary, map) :: map
  defp tool_msg(content, call_id, server, name, args) when is_binary(content) or is_nil(content) do
    %{
      role: :user,
      content: content,
      server_id: server && server.id,
      type: :tool,
      attributes: %{
        tool: %{
          call_id: call_id,
          name: name,
          arguments: args
        }
      }
    }
  end

  defp tool_msg([_ | _] = msgs, call_id, server, name, args) do
    msgs
    |> Enum.map(&tool_msg(&1, call_id, server, name, args))
    |> Enum.map(&Map.put(&1, :role, :user))
    |> Enum.reverse()
  end

  defp tool_msg(%{} = msg, call_id, _, name, args) do
    DeepMerge.deep_merge(%{
      role: :assistant,
      attributes: %{tool: %{call_id: call_id, name: name, arguments: args}}
    }, msg)
  end

  defp tool_results(res) when is_list(res), do: {:ok, Enum.reverse(res)}
  defp tool_results(err), do: err

  defp include_tools(opts, %ChatThread{} = thread) do
    case {thread, ChatSvc.find_tools(thread)} do
      {_, {:ok, [_ | _] = tools}} ->
        [{:tools, tools}, {:plural, Tools.tools(thread)} | opts]
      {%ChatThread{flow: %Flow{}}, _} ->
        [{:plural, Tools.tools(thread)} | opts]
      _ ->
        [{:plural, Tools.tools(thread)} | opts]
    end
  end

  defp current_thread(%ChatThread{} = thread) do
    case Tool.context() do
      %Tool.Context{session: %AgentSession{} = session} ->
        %{thread | session: session}
      _ -> thread
    end
  end

  defp persist?(%{persist: false}), do: false
  defp persist?(_), do: true

  defp fit_context_window(msgs, preface) do
    Enum.reduce(msgs, byte_size(preface), &msg_size(&1) + &2)
    |> trim_messages(msgs, Provider.context_window())
  end

  defp publish_tool(stream, content, id, name) do
    Stream.tool(id, name)
    publish_to_stream(stream, content)
    Stream.offset(1)
  end

  defp publish_to_stream(stream, %{content: content}), do: Stream.publish(stream, content, 1)
  defp publish_to_stream(stream, content) when is_binary(content), do: Stream.publish(stream, content, 1)
  defp publish_to_stream(_, _), do: :ok

  defp trim_messages(total, msgs, window) when total < window, do: msgs
  defp trim_messages(_, [_] = msgs, _), do: msgs
  defp trim_messages(_, [] = msgs, _), do: msgs
  defp trim_messages(total, [msg | rest], window),
    do: trim_messages(total - msg_size(msg), rest, window)

  defp msg_size(%{content: content}), do: byte_size(content)
  defp msg_size({_, content}), do: byte_size(content)
  defp msg_size({_, content, _}), do: byte_size(content)
end
