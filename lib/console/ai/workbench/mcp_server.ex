defmodule Console.AI.Workbench.MCPServer do
  @moduledoc """
  Exposes a workbench's toolset as an MCP server, so the tools configured on a workbench can
  be driven by any external agent.

  The workbench and acting user are bound by `ConsoleWeb.Plugs.WorkbenchMCP`, which authorizes
  the request before it ever reaches this module.  Tools are registered per session from that
  workbench and dispatched back through the standard `Console.AI.Tool` contract.
  """
  use Anubis.Server,
    name: "plural-workbench",
    version: "0.1.0",
    capabilities: [:tools]

  alias Anubis.MCP.Error
  alias Anubis.Server.{Frame, Response}
  alias Anubis.Server.Component.Tool, as: MCPTool
  alias Console.AI.Tool
  alias Console.AI.Workbench.Toolset
  alias Console.AI.Workbench.Toolset.Classify
  alias Console.Schema.{AgentRuntime, User, Workbench}

  @impl true
  def init(_client_info, %Frame{assigns: %{mcp_workbench: %Workbench{} = bench, mcp_user: %User{} = user}} = frame) do
    tools =
      Toolset.tools(bench, user)
      |> Toolset.filter(frame.assigns[:mcp_filter] || :all)
      |> Map.new(& {mcp_name(&1), &1})

    Enum.reduce(tools, frame, fn {name, tool}, frame -> register(frame, name, tool) end)
    |> Frame.assign(:bound_workbench_id, bench.id)
    |> Frame.assign(:bound_tools, tools)
    |> then(& {:ok, &1})
  end
  def init(_, _), do: {:error, "no workbench is bound to this session"}

  @impl true
  def handle_tool_call(name, args, %Frame{assigns: assigns} = frame) do
    with :ok <- verify_binding(assigns),
         {:ok, tool} <- fetch_tool(assigns, name),
         :ok <- put_context(assigns),
         {:ok, validated} <- Tool.validate(tool, args) do
      Tool.implement(tool, validated)
      |> respond(frame)
    else
      {:error, %Ecto.Changeset{} = cs} ->
        {:error, Error.protocol(:invalid_params, %{message: changeset_message(cs)}), frame}
      {:error, :not_found} ->
        {:error, Error.protocol(:invalid_params, %{message: "tool not found: #{name}"}), frame}
      {:error, message} ->
        {:error, Error.execution(stringify(message)), frame}
    end
  end

  # tool failures come back as isError tool results rather than protocol errors, so the
  # calling model can see what went wrong and adapt
  defp respond({:ok, result}, frame), do: {:reply, Response.text(Response.tool(), stringify(result)), frame}
  defp respond({:error, error}, frame), do: {:reply, Response.error(Response.tool(), stringify(error)), frame}
  defp respond(result, frame), do: {:reply, Response.text(Response.tool(), stringify(result)), frame}

  # session ids aren't scoped to a url, so a client could initialize against one workbench and
  # replay the session id against another.  the plug re-resolves the workbench on every request,
  # so comparing it against the one bound at init closes that off.
  defp verify_binding(%{bound_workbench_id: id, mcp_workbench: %Workbench{id: id}}), do: :ok
  defp verify_binding(_), do: {:error, "this session is not bound to the requested workbench"}

  defp fetch_tool(%{bound_tools: %{} = tools}, name) do
    case Map.fetch(tools, name) do
      {:ok, tool} -> {:ok, tool}
      :error -> {:error, :not_found}
    end
  end
  defp fetch_tool(_, _), do: {:error, :not_found}

  # tool context is process local and requests are dispatched in their own tasks, so this has
  # to happen here rather than in init/2
  defp put_context(%{mcp_user: %User{} = user, mcp_workbench: %Workbench{agent_runtime: %AgentRuntime{} = runtime}}) do
    Tool.context(user: user, runtime: runtime)
    :ok
  end
  defp put_context(%{mcp_user: %User{} = user}) do
    Tool.context(user: user)
    :ok
  end
  defp put_context(_), do: {:error, "no user is bound to this session"}

  # anubis treats :input_schema as a peri schema and runs it through Peri.to_json_schema/2,
  # which mangles the json schema our tools already emit, so the component is built directly.
  # a nil validator would make anubis drop the arguments, and validation is the changeset's job
  # anyway, so input validation is a passthrough here.
  defp register(%Frame{} = frame, name, tool) do
    mcp = %MCPTool{
      name: name,
      title: name,
      description: Tool.description(tool),
      input_schema: input_schema(tool),
      annotations: %{"readOnlyHint" => Classify.readonly?(tool)},
      validate_input: &{:ok, &1}
    }

    %{frame | tools: Map.put(frame.tools, name, mcp)}
  end

  defp input_schema(tool) do
    case Tool.json_schema(tool) do
      %{} = schema -> schema
      _ -> %{"type" => "object"}
    end
  end

  @invalid_chars ~r/[^a-zA-Z0-9_-]/

  # workbench tool names allow dots, which most mcp clients reject
  defp mcp_name(tool), do: String.replace(Tool.name(tool), @invalid_chars, "_")

  defp stringify(result) when is_binary(result), do: result
  defp stringify(result), do: inspect(result)

  defp changeset_message(%Ecto.Changeset{} = cs) do
    Ecto.Changeset.traverse_errors(cs, fn {msg, opts} ->
      Enum.reduce(opts, msg, fn {k, v}, acc -> String.replace(acc, "%{#{k}}", to_string(v)) end)
    end)
    |> inspect()
  end
end
