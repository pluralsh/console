defmodule Console.AI.Workbench.MCP do
  alias Console.AI.MCP.{Agent, Tool}
  alias Console.AI.Tools.Workbench.MCP, as: MCPTool
  alias Console.AI.Workbench.MCP.{Basic, Sentry, Linear, Atlassian}
  alias Console.Schema.{WorkbenchTool, WorkbenchJob}

  @callback transport(%WorkbenchTool{}, %WorkbenchJob{}) :: {:sse, list} | {:streamable_http, list}

  def mcp?(%WorkbenchTool{tool: :mcp}), do: true
  def mcp?(%WorkbenchTool{tool: :sentry}), do: true
  def mcp?(%WorkbenchTool{tool: :linear}), do: true
  def mcp?(%WorkbenchTool{tool: :atlassian}), do: true
  def mcp?(_), do: false

  def transport(%WorkbenchTool{tool: :mcp} = t, %WorkbenchJob{} = j), do: Basic.transport(t, j)
  def transport(%WorkbenchTool{tool: :sentry} = t, %WorkbenchJob{} = j), do: Sentry.transport(t, j)
  def transport(%WorkbenchTool{tool: :linear} = t, %WorkbenchJob{} = j), do: Linear.transport(t, j)
  def transport(%WorkbenchTool{tool: :atlassian} = t, %WorkbenchJob{} = j), do: Atlassian.transport(t, j)

  def expand_tools(%{} = tools, job), do: expand_tools(Map.values(tools), job)
  def expand_tools(tools, %WorkbenchJob{} = j) when is_list(tools) do
    Enum.filter(tools, &mcp?/1)
    |> Enum.flat_map(fn tool ->
      case list_tools(tool, j) do
        {:ok, mcp_tools} ->
          Enum.map(mcp_tools, & %MCPTool{tool: tool, mcp_tool: &1, job: j})
        _ -> []
      end
    end)
  end

  def list_tools(%WorkbenchTool{} = t, %WorkbenchJob{} = j) do
    Console.Retrier.retry(fn ->
      Agent.name(:client, t, j)
      |> Hermes.Client.Base.list_tools()
    end)
    |> case do
      {:ok, %Hermes.MCP.Response{result: %{"tools" => found}}} ->
        {:ok, Enum.map(found, &Tool.new/1)}
      err -> {:error, "failed to list tools: #{inspect(err)}"}
    end
  end

  def invoke(%WorkbenchTool{} = t, %WorkbenchJob{} = j, name, args) do
    Agent.name(:client, t, j)
    |> Hermes.Client.Base.call_tool(name, args)
    |> case do
      {:ok, %Hermes.MCP.Response{result: %{"content" => content}}} ->
        {:ok, concat_content(content)}
      {:error, error} -> {:error, "MCP Server tool #{name} for #{t.name} has error: #{inspect(error)}"}
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
