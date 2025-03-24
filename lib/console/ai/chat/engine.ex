defmodule Console.AI.Chat.Engine do
  use Console.Services.Base
  import Console.AI.Evidence.Base, only: [append: 2]
  alias Console.Schema.{Chat, Chat.Attributes, ChatThread, Flow, User, McpServer, McpServerAudit}
  alias Console.AI.{Provider, Tool, Stream}
  alias Console.AI.Tools.{
    Clusters,
    Logs
  }
  alias Console.AI.Tools.Services, as: SvcTool
  alias Console.AI.MCP.{Discovery, Agent}
  alias Console.AI.Chat, as: ChatSvc

  @chat """
  The following is a chat history concerning a set of kubernetes or devops questions, usually encompassing topics like terraform,
  helm, GitOps, and other technologies and best practices.  Please provide a response suitable for a junior engineer
  with minimal infrastructure experience, providing as much documentation and links to supporting materials as possible.
  """

  @plrl_tools [Clusters, SvcTool, Logs]

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
        %Tool{name: "#{mcp_server.name}.#{name}", arguments: args},
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

  @doc"""
  This will run a sequence of completions in a row gathering tools so users don't have to drive the RAG process manually.

  Automatically cuts off at a depth of three to avoid runaway scenarios.
  """
  @spec completion(Provider.history, ChatThread.t, User.t, Chat.history, integer) :: {:ok, Chat.t} | {:ok, [Chat.t]} | Console.error
  def completion(messages, thread, user, completion \\ [], level \\ 0)
  def completion(_, %ChatThread{id: thread_id}, %User{} = user, completion, 3) do
    completion
    |> Enum.map(&Chat.attributes/1)
    |> ChatSvc.save_messages(thread_id, user)
  end

  def completion(messages, %ChatThread{id: thread_id} = thread, %User{} = user, completion, level) do
    Enum.concat(messages, completion)
    |> Enum.map(&Chat.message/1)
    |> Enum.filter(& &1)
    |> Provider.completion(include_tools([preface: @chat], thread))
    |> case do
      {:ok, content} ->
        append(completion, {:assistant, content})
        |> Enum.map(&Chat.attributes/1)
        |> ChatSvc.save_messages(thread_id, user)
      {:ok, content, tools} ->
        {plural, mcp} = Enum.split_with(tools, &String.starts_with?(&1.name, "__plrl__"))
        with {:ok, plrl_res} <- call_plrl_tools(plural, @plrl_tools),
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
              |> ChatSvc.save_messages(thread_id, user)
            false ->
              completion(messages, thread, user, completion, level + 1)
          end
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
    Enum.reduce_while(tools, [], fn %Tool{name: name, arguments: args}, acc ->
      with {:ok, impl}    <- Map.fetch(by_name, name),
           {:ok, parsed}  <- Tool.validate(impl, args),
           {:ok, content} <- impl.implement(parsed) do
        Stream.publish(stream, content, 1)
        Stream.offset(1)
        {:cont, [tool_msg(content, nil, name, args) | acc]}
      else
        _ -> {:halt, {:error, "failed to call tool: #{name}"}}
      end
    end)
    |> tool_results()
  end

  @spec call_mcp_tools([Tool.t], ChatThread.t, User.t) :: {:ok, [%{role: Provider.sender, content: binary}]} | {:error, binary}
  defp call_mcp_tools(tools, %ChatThread{} = thread, %User{} = user) do
    servers_by_name = Map.new(ChatSvc.servers(thread), & {&1.name, &1})
    stream = Stream.stream(:user)
    Enum.reduce_while(tools, [], fn %Tool{name: name, arguments: args} = tool, acc ->
      with {sname, tname} <- Agent.tool_name(name),
           {tname, %McpServer{confirm: false} = server} <- {tname, servers_by_name[sname]},
           {:ok, content} <- call_tool(tool, thread, server, user) do
        Stream.publish(stream, content, 1)
        Stream.offset(1)
        {:cont, [tool_msg(content, server, tname, args) | acc]}
      else
        {tname, %McpServer{confirm: true} = server} ->
          msg = tool_msg(nil, server, tname, args)
                |> Map.put(:confirm, true)
          {:cont, [msg | acc]}
        {:error, err} -> {:halt, {:error, err}}
        _ -> {:halt, {:error, "tool calling error: invalid tool name #{name}"}}
      end
    end)
    |> tool_results()
  end

  @spec call_tool(Tool.t, ChatThread.t, McpServer.t, User.t) :: {:ok, binary} | {:error, binary}
  defp call_tool(%Tool{name: name, arguments: arguments}, thread, %McpServer{name: sname} = server, %User{} = user) do
    {_, tname} = Agent.tool_name(name)
    start_transaction()
    |> add_operation(:audit, fn _ ->
      %McpServerAudit{server_id: server.id, actor_id: user.id}
      |> McpServerAudit.changeset(%{tool: tname, arguments: arguments})
      |> Repo.insert()
    end)
    |> add_operation(:tool, fn _ ->
      case Discovery.invoke(thread, name, arguments) do
        {:ok, result} ->
          {:ok, "Result from calling MCP server #{sname} with tool #{tname}:\n#{result}"}
        {:error, err} -> {:error, "Internal tool call failure for tool #{name}: #{inspect(err)}"}
      end
    end)
    |> execute(extract: :tool)
  end

  @spec tool_msg(binary, McpServer.t | nil, binary, map) :: map
  defp tool_msg(content, server, name, args) do
    %{
      role: :user,
      content: content,
      server_id: server && server.id,
      attributes: %{
        tool: %{
          name: name,
          arguments: args
        }
      }
    }
  end

  defp tool_results(res) when is_list(res), do: {:ok, Enum.reverse(res)}
  defp tool_results(err), do: err

  defp include_tools(opts, thread) do
    case {thread, ChatSvc.find_tools(thread)} do
      {_, {:ok, [_ | _] = tools}} -> [{:tools, tools}, {:plural, @plrl_tools} | opts]
      {%ChatThread{flow: %Flow{}}, _} -> [{:plural, @plrl_tools} | opts]
      _ -> opts
    end
  end
end
