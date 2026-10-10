defmodule Console.AI.Workbench.MCP do
  alias Console.AI.MCP.Tool
  alias Console.AI.Tools.Workbench.MCP, as: MCPTool
  alias Console.AI.Workbench.MCP.{Basic, Linear, Atlassian, Exa, Github, Clients}
  alias Console.Schema.{WorkbenchTool, WorkbenchJob}

  @callback transport(%WorkbenchTool{}) :: {:sse, list} | {:streamable_http, list}

  def mcp?(%WorkbenchTool{tool: :mcp}), do: true
  def mcp?(%WorkbenchTool{tool: :linear}), do: true
  def mcp?(%WorkbenchTool{tool: :atlassian}), do: true
  def mcp?(%WorkbenchTool{tool: :exa}), do: true
  def mcp?(%WorkbenchTool{tool: :github}), do: false
  def mcp?(_), do: false

  def transport(%WorkbenchTool{tool: :mcp} = t), do: Basic.transport(t)
  def transport(%WorkbenchTool{tool: :linear} = t), do: Linear.transport(t)
  def transport(%WorkbenchTool{tool: :atlassian} = t), do: Atlassian.transport(t)
  def transport(%WorkbenchTool{tool: :exa} = t), do: Exa.transport(t)
  def transport(%WorkbenchTool{tool: :github} = t), do: Github.transport(t)

  @doc "Makes sure a client is running for every MCP-backed tool, reusing any already up."
  @spec start_clients([WorkbenchTool.t] | map) :: {:ok, [pid]} | Console.error
  def start_clients(%{} = tools), do: start_clients(Map.values(tools))
  def start_clients(tools) when is_list(tools) do
    Enum.filter(tools, &mcp?/1)
    |> Enum.reduce_while({:ok, []}, fn tool, {:ok, pids} ->
      case Clients.ensure_started(tool) do
        {:ok, pid} -> {:cont, {:ok, [pid | pids]}}
        err -> {:halt, err}
      end
    end)
  end

  def expand_tools(%{} = tools, job), do: expand_tools(Map.values(tools), job)
  def expand_tools(tools, %WorkbenchJob{} = j) when is_list(tools) do
    Enum.filter(tools, &mcp?/1)
    |> Enum.flat_map(fn tool ->
      case list_tools(tool) do
        {:ok, mcp_tools} ->
          Enum.flat_map(mcp_tools, fn
            %Tool{} = mcp_tool -> [%MCPTool{tool: tool, mcp_tool: mcp_tool, job: j}]
            _ -> []
          end)
        _ -> []
      end
    end)
  end

  def list_tools(%WorkbenchTool{} = t) do
    with {:ok, _} <- Clients.ensure_started(t) do
      # a freshly started client may still be mid-handshake
      Console.Retrier.retry(fn -> call(t, &Anubis.Client.list_tools/1) end, max: 8, pause: 150)
    end
    |> case do
      {:ok, %Anubis.MCP.Response{result: %{"tools" => found}}} when is_list(found) ->
        {:ok, Enum.flat_map(found, fn
          tool when is_map(tool) -> List.wrap(Tool.new(tool))
          _ -> []
        end)}
      err -> {:error, "failed to list tools: #{inspect(err)}"}
    end
  end

  def invoke(%WorkbenchTool{} = t, name, args) do
    call(t, &Anubis.Client.call_tool(&1, name, args))
    |> case do
      {:ok, %Anubis.MCP.Response{result: %{"content" => content}}} ->
        {:ok, concat_content(content)}
      {:error, error} -> {:error, "MCP Server tool #{name} for #{t.name} has error: #{inspect(error)}"}
    end
  end

  # a client can expire between the lookup and the call.  only :noproc is retried, since the
  # request provably never reached the server, so a tool call is never sent twice
  defp call(t, fun, retries \\ 1) do
    with {:ok, _} <- Clients.ensure_started(t) do
      try do
        fun.(Clients.name(t))
      catch
        :exit, {:noproc, _} when retries > 0 -> call(t, fun, retries - 1)
        :exit, reason -> {:error, {:exit, reason}}
      end
    end
  end

  defp concat_content(content) when is_list(content) do
    Enum.map(content, fn
      %{"type" => "text", "text" => t} -> t
      _ -> ""
    end)
    |> IO.iodata_to_binary()
  end
  defp concat_content(content) when is_binary(content), do: content
end
