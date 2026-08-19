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
    AgentRuntime,
    WorkbenchJob
  }
  alias Console.AI.Chat.Knowledge
  alias Console.Deployments.{Git, Settings, Agents}
  alias Console.Deployments.Policy, as: PolicySvc

  @type t :: %__MODULE__{}

  defmodule Approval do
    defstruct [:reason]

    def new([_ | _] = reasons) do
      Enum.map(reasons, fn
        %{"reason" => reason} -> reason
        %{"msg" => msg} -> msg
        _ -> "approval granted"
      end)
      |> then(& struct(__MODULE__, reason: "Automatically approved due to: #{Enum.join(&1, ", ")}"))
    end
    def new(reason), do: struct(__MODULE__, reason: reason)

    def attrs(%__MODULE__{reason: reason}), do: %{approval_reason: reason, auto_approve: true}
    def attrs(_), do: %{}
  end

  defmodule Policy do
    @type t :: %__MODULE__{
      regexes: [Regex.t],
      ignore: [String.t],
      name: String.t,
      policy: String.t,
      policy_id: String.t
    }
    defstruct [:regexes, :ignore, :name, :policy, :policy_id]

    def matches?(%__MODULE__{regexes: [_ | _] = regexes, ignore: ignore}, name) do
      cond do
        is_list(ignore) and name in ignore -> false
        is_list(regexes) and Enum.any?(regexes, &Regex.match?(&1, name)) -> true
        true -> false
      end
    end
    def matches?(%__MODULE__{ignore: [_ | _] = ignore}, name), do: name in ignore
    def matches?(_, _), do: true
  end

  defmodule Context do
    alias Console.Schema.{AgentSession, Flow, User, AiInsight, Stack, Cluster, Service, InfraResearch, AgentRuntime, WorkbenchJob}
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
      runtime: AgentRuntime.t,
      job: WorkbenchJob.t
    }

    defstruct [:flow, :user, :insight, :stack, :cluster, :service, :session, :thread, :research, :runtime, :job]

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
      %Context{job:      %WorkbenchJob{} = job} -> job
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

  def name(t) when is_atom(t), do: "#{t.name()}"
  def name(%tool{} = t), do: tool.name(t)

  def description(t) when is_atom(t), do: t.description()
  def description(%tool{} = t), do: tool.description(t)

  def json_schema(t) when is_atom(t), do: t.json_schema()
  def json_schema(%tool{} = t), do: tool.json_schema(t)

  def policy(tool, input, [_ | _] = policies) do
    with [_ | _] = pols <- Enum.filter(policies, &Policy.matches?(&1, name(tool))) do
      case compile_policies(pols) do
        {:ok, engine} -> validate_policy(engine, tool,  input, pols)
        err -> err
      end
    else
      _ -> {:ok, tool}
    end
  end
  def policy(tool, _, _), do: {:ok, tool}

  @policy_base Console.priv_file!("policy/wb.rego")

  defp validate_policy(engine, tool, input, policies) do
    Enum.map(policies, & &1.policy_id)
    |> then(&PolicySvc.eval_policy(engine, maybe_actor(%{"tool" => input, "tool_name" => name(tool)}), &1))
    |> case do
      {:ok, %{"deny" => [_ | _] = denials}} -> {:error, "Policy denied: #{inspect(denials)}"}
      {:ok, %{"approve" => [_ | _] = approvals}} ->
        case tool do
          %{approval: _} = tool -> {:ok, %{tool | approval: Approval.new(approvals)}}
          _ -> {:ok, tool}
        end
      {:error, _} = err -> err
      _ -> {:ok, tool}
    end
  end

  defp maybe_actor(input) do
    case actor() do
      %User{id: id, name: name, email: email, groups: groups} ->
        Map.put(input, "actor", %{
          "groups" => (if is_list(groups), do: Enum.map(groups, & &1.name), else: []),
          "id" => id,
          "email" => email,
          "name" => name
        })
      _ -> input
    end
  end

  defp compile_policies(policies) do
    with {:ok, engine} <- Regolix.new(),
         {:ok, engine} <- Regolix.add_policy(engine, "plrl.rego", @policy_base) do
      Enum.reduce_while(policies, engine, fn %{policy: p, name: n}, eng ->
        case Regolix.add_policy(eng, n, p) do
          {:ok, engine} -> {:cont, engine}
          {:error, reason} -> {:halt, {:error, "Failed to add policy #{n}: #{inspect(reason)}"}}
        end
      end)
      |> case do
        {:error, _} = error -> error
        engine -> {:ok, engine}
      end
    end
  end

  def validate(tool, input) when is_atom(tool) do
    struct(tool, %{})
    |> tool.changeset(input)
    |> Ecto.Changeset.apply_action(:update)
  end

  def validate(%tool{} = t, input) do
    tool.changeset(t, input)
    |> Ecto.Changeset.apply_action(:update)
  end

  def implement(tool, input) when is_atom(tool), do: tool.implement(input)
  def implement(%tool{}, input), do: tool.implement(input)

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
