defmodule Console.AI.Workbench.MCP do
  alias Console.Jwt.MCP
  alias Console.AI.MCP.{Agent, Tool}
  alias Console.AI.Tools.Workbench.MCP, as: MCPTool
  alias Console.Schema.{
    WorkbenchTool,
    WorkbenchJob,
    McpServer,
    User
  }

  def mcp?(%WorkbenchTool{tool: :mcp}), do: true
  def mcp?(%WorkbenchTool{tool: :sentry}), do: true
  def mcp?(_), do: false

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
    Agent.name(:client, t, j)
    |> Console.AI.MCP.Client.list_tools()
    |> case do
      {:ok, %Hermes.MCP.Response{result: %{"tools" => found}}} ->
        {:ok, Enum.map(found, &Tool.new/1)}
      err -> {:error, "failed to list tools: #{inspect(err)}"}
    end
  end

  def invoke(%WorkbenchTool{} = t, %WorkbenchJob{} = j, name, args) do
    Agent.name(:client, t, j)
    |> Console.AI.MCP.Client.call_tool(name, args)
    |> case do
      {:ok, %Hermes.MCP.Response{result: %{"content" => content}}} ->
        {:ok, concat_content(content)}
      {:error, error} -> {:error, "MCP Server tool #{name} for #{t.name} has error: #{inspect(error)}"}
    end
  end

  def transport(
    %WorkbenchTool{tool: :mcp, mcp_server: %McpServer{protocol: :sse, url: url} = srv},
    %WorkbenchJob{} = job
  ), do: {:sse, [base_url: url, headers: auth_headers(job.user, srv)]}
  def transport(
    %WorkbenchTool{tool: :mcp, mcp_server: %McpServer{protocol: :streamable_http, url: url} = srv},
    %WorkbenchJob{} = job
  ), do: {:streamable_http, [url: url, headers: auth_headers(job.user, srv)]}
  def transport(%WorkbenchTool{tool: :sentry, configuration: %{sentry: sentry}}, _),
    do: {:streamable_http, sentry_transport(sentry)}

  defp auth_headers(%User{} = user, %McpServer{authentication: %{plural: true}} = srv) do
    {:ok, jwt, _} = MCP.mint(user)
    auth_headers(user, put_in(srv.authentication.plural, false))
    |> Map.put("Authorization", "Bearer #{jwt}")
  end
  defp auth_headers(_, %McpServer{authentication: %{headers: [_ | _] = headers}}),
    do: Map.new(headers, &{&1.name, &1.value})
  defp auth_headers(_, _), do: %{}

  defp sentry_transport(%{url: url, access_token: access_token, path: path, agent_mode: agent_mode}) do
    sentry_url(url || "https://mcp.sentry.dev/mcp", path)
    |> sentry_agent_mode(agent_mode)
    |> then(& [url: &1, headers: %{"Authorization" => "Bearer #{access_token}"}])
  end

  defp sentry_url(base_url, path) when is_binary(path) and byte_size(path) > 0,
    do: Path.join(base_url, path)
  defp sentry_url(base_url, _), do: base_url

  defp sentry_agent_mode(path, true), do: "#{path}?agent=1"
  defp sentry_agent_mode(path, _), do: path

  defp concat_content(content) when is_list(content) do
    Enum.map(content, fn
      %{"type" => "text", "text" => t} -> t
      _ -> ""
    end)
    |> IO.iodata_to_binary()
  end
  defp concat_content(content) when is_binary(content), do: content
end
