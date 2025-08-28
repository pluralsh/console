defmodule Console.AI.Provider do
  use Nebulex.Caching
  import Console.Services.Base, only: [ok: 1]
  import Console.GraphQl.Helpers, only: [resolve_changeset: 1]
  alias Console.Schema.{DeploymentSettings, DeploymentSettings.AI}
  alias Console.AI.{OpenAI, Anthropic, Ollama, Azure, Bedrock, Vertex, Tool}

  @type sender :: :system | :user | :assistant
  @type error :: Console.error
  @type tool :: %{call_id: binary, name: binary, arguments: map}
  @type message :: {sender, binary} | {:tool, binary, tool}
  @type history :: [message]
  @type tool_result :: [Tool.t]
  @type completion_result :: {:ok, binary} | {:ok, binary, [Tool.t]} | Console.error

  @default_context_window 128_000 * 4
  @local_cache Console.conf(:local_cache)

  @preface {:system, """
  You're a seasoned devops engineer with experience in Kubernetes, GitOps and Infrastructure As Code, and need to
  give a concise but clear explanation of issues in your companies kubernetes infrastructure.  The user is not necessarily
  an expert in the domain, so assume they're not familiar with the terminology and provide a clear explanation of the issue.
  """}

  @summary """
  You're a seasoned devops engineer with experience in Kubernetes, GitOps and Infrastructure as Code.  The following is a detailed explanation of how to debug an issue in a user's kubernetes or cloud infrastructure.
  Please provide a brief, easily digestable summary. The whole summary should be two sentences. Summarize the problem in a single sentence, then explain the solution at a high level in a single sentence.
  """

  @callback completion(struct, history, keyword) :: completion_result

  @callback tool_call(struct, history, [atom]) :: {:ok, binary | tool_result} | error

  @callback embeddings(struct, binary) :: {:ok, [{binary, [float]}]} | error

  @callback tools?() :: boolean

  @callback context_window(struct) :: integer

  def tools?() do
    Console.Deployments.Settings.cached()
    |> tool_client()
    |> case do
      {:ok, %mod{}} -> mod.tools?()
      _ -> false
    end
  end

  @decorate cacheable(cache: @local_cache, key: :context_window, ttl: :timer.minutes(30))
  def context_window() do
    settings = Console.Deployments.Settings.cached()
    case client(settings) do
      {:ok, %mod{} = client} -> mod.context_window(client)
      _ -> @default_context_window
    end
  end

  def completion(history, opts \\ []) do
    settings = Console.Deployments.Settings.cached()
    with {:ok, %mod{} = client} <- client(settings),
      do: mod.completion(client, add_preface(history, opts), opts)
  end

  def tool_call(history, tools, opts \\ []) do
    settings = Console.Deployments.Settings.cached()
    with {:ok, %mod{} = client} <- tool_client(settings),
         {:ok, result} <- mod.tool_call(client, add_preface(history, opts), tools),
      do: handle_tool_calls(result, tools)
  end

  def embeddings(text) do
    settings = Console.Deployments.Settings.cached()
    with {:ok, %mod{} = client} <- embedding_client(settings),
      do: mod.embeddings(client, text)
  end

  def summary(text), do: completion([{:user, text}], preface: @summary)

  defp embedding_client(%DeploymentSettings{ai: %AI{embedding_provider: p}} = settings) when not is_nil(p),
    do: client(put_in(settings.ai.provider, p))
  defp embedding_client(settings), do: client(settings)

  defp tool_client(%DeploymentSettings{ai: %AI{tool_provider: p}} = settings) when not is_nil(p),
    do: client(put_in(settings.ai.provider, p))
  defp tool_client(settings), do: client(settings)

  defp client(%DeploymentSettings{ai: %AI{enabled: true, provider: :openai, openai: %{} = openai}}),
    do: {:ok, OpenAI.new(openai)}
  defp client(%DeploymentSettings{ai: %AI{enabled: true, provider: :anthropic, anthropic: %{} = anthropic}}),
    do: {:ok, Anthropic.new(anthropic)}
  defp client(%DeploymentSettings{ai: %AI{enabled: true, provider: :ollama, ollama: %{} = ollama}}),
    do: {:ok, Ollama.new(ollama)}
  defp client(%DeploymentSettings{ai: %AI{enabled: true, provider: :azure, azure: %{} = azure}}),
    do: {:ok, Azure.new(azure)}
  defp client(%DeploymentSettings{ai: %AI{enabled: true, provider: :bedrock, bedrock: %{} = bedrock}}),
    do: {:ok, Bedrock.new(bedrock)}
  defp client(%DeploymentSettings{ai: %AI{enabled: true, provider: :vertex, vertex: %{} = vertex}}),
    do: {:ok, Vertex.new(vertex)}
  defp client(_), do: {:error, "ai not enabled for this Plural Console instance"}

  defp handle_tool_calls([arg | _] = calls, tools) when is_map(arg) do
    tools_by_name = Map.new(tools, & {"#{&1.name()}", &1})
    Enum.filter(calls, & Map.get(tools_by_name, &1.name))
    |> Enum.map(fn %Tool{name: n, arguments: args} ->
      tool = tools_by_name[n]
      with {:ok, struct} <- Tool.validate(tool, args),
           {:ok, result} <- tool.implement(struct) do
        %{tool.name() => %{result: result}}
      else
        {:error, res} when is_binary(res) -> %{tool.name() => %{error: res}}
        {:error, %Ecto.Changeset{} = cs} -> %{tool.name() => %{error: Enum.join(resolve_changeset(cs), ". ")}}
        {:error, [r | _] = errs} when is_binary(r) ->
          %{tool.name() => %{error: Enum.join(errs, "\n")}}
        err -> raise ArgumentError, message: "unknown tool error: #{inspect(err)}"
      end
    end)
    |> ok()
  end
  defp handle_tool_calls(res, _) when is_binary(res), do: {:ok, res}

  defp add_preface(history, opts) do
    case opts[:preface] do
      val when is_binary(val) -> [{:system, val} | history]
      :ignore -> history
      _ -> [@preface | history]
    end
  end
end
