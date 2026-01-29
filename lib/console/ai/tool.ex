defmodule Console.AI.Tool do
  alias Console.Schema.{
    DeploymentSettings,
    User,
    Flow,
    Service,
    Stack,
    Cluster,
    AiInsight,
    AgentSession,
    ChatThread,
    InfraResearch,
    AgentRuntime
  }
  alias Console.AI.Chat.Knowledge
  alias Console.Deployments.{Git, Settings, Agents}

  @type t :: %__MODULE__{}

  defmodule Context do
    alias Console.Schema.{AgentSession, Flow, User, AiInsight, Stack, Cluster, Service, InfraResearch, AgentRuntime}
    @type t :: %__MODULE__{
      flow: Flow.t,
      user: User.t,
      insight: AiInsight.t,
      stack: Stack.t,
      cluster: Cluster.t,
      service: Service.t,
      session: AgentSession.t,
      thread: ChatThread.t,
      research: InfraResearch.t,
      runtime: AgentRuntime.t
    }

    defstruct [:flow, :user, :insight, :stack, :cluster, :service, :session, :thread, :research, :runtime]

    def new(args), do: struct(__MODULE__, args)
  end

  defstruct [:id, :name, :arguments, pending: false]

  @callback json_schema() :: map
  @callback name() :: atom
  @callback description() :: binary
  @callback changeset(struct, map) :: Ecto.Changeset.t
  @callback implement(struct) :: {:ok, term} | Console.error

  @ctx {__MODULE__, :context}

  def context(), do: Process.get(@ctx)

  def context(attrs), do: Process.put(@ctx, struct(Context, attrs))

  def upsert(attrs) do
    case Process.get(@ctx) do
      %Context{} = ctx -> Process.put(@ctx, Map.merge(ctx, Map.new(attrs)))
      _ -> context(attrs)
    end
  end

  def actor() do
    case Process.get(@ctx) do
      %Context{user: %User{} = user} -> user
      _ -> nil
    end
  end

  @spec parent() :: Knowledge.parent | nil
  def parent() do
    case Process.get(@ctx) do
      %Context{flow:     %Flow{} = flow} -> flow
      %Context{service:  %Service{flow: %Flow{} = flow}} -> flow
      %Context{service:  %Service{} = svc} -> svc
      %Context{research: %InfraResearch{} = research} -> research
      %Context{stack:    %Stack{} = stack} -> stack
      %Context{cluster:  %Cluster{} = cluster} -> cluster
      %Context{insight:  %AiInsight{service: %Service{} = svc}} -> svc
      %Context{insight:  %AiInsight{stack: %Stack{} = stack}} -> stack
      %Context{insight:  %AiInsight{cluster: %Cluster{} = cluster}} -> cluster
      _ -> nil
    end
  end

  def flow() do
    case Process.get(@ctx) do
      %Context{flow: %Flow{} = flow} -> flow
      _ -> nil
    end
  end

  def session() do
    case Process.get(@ctx) do
      %Context{session: %AgentSession{} = session} -> session
      _ -> nil
    end
  end

  def insight() do
    case Process.get(@ctx) do
      %Context{insight: %AiInsight{} = insight} -> insight
      _ -> nil
    end
  end

  def thread() do
    case Process.get(@ctx) do
      %Context{thread: %ChatThread{} = thread} -> thread
      _ -> nil
    end
  end

  def validate(tool, input) do
    struct(tool, %{})
    |> tool.changeset(input)
    |> Ecto.Changeset.apply_action(:update)
  end

  def scm_connection() do
    case Settings.cached() do
      %DeploymentSettings{ai: %{tools: %{create_pr: %{connection_id: id}}}} when is_binary(id) ->
        Git.get_scm_connection(id)
      _ -> Git.default_scm_connection()
    end
  end

  def agent_runtime() do
    case Process.get(@ctx) do
      %Context{runtime: %AgentRuntime{} = runtime} -> runtime
      _ -> Agents.default_runtime()
    end
  end
end
