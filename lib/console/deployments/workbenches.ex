defmodule Console.Deployments.Workbenches do
  use Console.Services.Base
  use Nebulex.Caching
  import Console.Deployments.Policies
  import Console.AI.Workbench.Mentions
  import Console.Schema.WorkbenchJobActivity, only: [is_action: 1]
  alias Console.Schema.{
    User,
    Workbench,
    Workbench.Budget,
    AIUsage,
    WorkbenchJob,
    WorkbenchTool,
    WorkbenchJobActivity,
    WorkbenchJobResult,
    WorkbenchCron,
    WorkbenchPrompt,
    WorkbenchSkill,
    WorkbenchEval,
    WorkbenchEvalResult,
    WorkbenchWebhook,
    ObservabilityWebhook,
    IssueWebhook,
    ChatConnection,
    WorkbenchChatbot,
    WorkbenchPolicy,
    WorkbenchJobActivityAgentRun,
    WorkbenchJobThought,
    PullRequest,
    FlowWorkbench,
    StackRun,
    Service,
    QueuedPrompt
  }
  alias Console.AI.{Provider, VectorStore}
  alias Console.AI.Tools.Workbench.{FunctionCall, KubeRequest, SavedPrompt, KubeShell}
  alias Console.Services.Users
  alias Console.Deployments.Settings
  alias Console.PubSub
  alias Kube.Utils, as: KUtils

  require EEx

  @type error :: Console.error
  @type workbench_resp :: {:ok, Workbench.t()} | error
  @type tool_resp :: {:ok, WorkbenchTool.t()} | error
  @type job_resp :: {:ok, WorkbenchJob.t()} | error
  @type activity_resp :: {:ok, WorkbenchJobActivity.t()} | error
  @type cron_resp :: {:ok, WorkbenchCron.t()} | error
  @type prompt_resp :: {:ok, WorkbenchPrompt.t()} | error
  @type queued_prompt_resp :: {:ok, QueuedPrompt.t()} | error
  @type skill_resp :: {:ok, WorkbenchSkill.t()} | error
  @type eval_resp :: {:ok, WorkbenchEval.t()} | error
  @type webhook_resp :: {:ok, WorkbenchWebhook.t()} | error
  @type chatbot_resp :: {:ok, WorkbenchChatbot.t()} | error
  @type workbench_policy_resp :: {:ok, WorkbenchPolicy.t()} | error

  @cache_adapter Console.conf(:cache_adapter)
  @ttl :timer.hours(6)

  def get_workbench!(id), do: Repo.get!(Workbench, id)
  def get_workbench_with_lock!(id), do: Repo.get!(Workbench.with_lock(), id)
  def get_workbench(id), do: Repo.get(Workbench, id)
  def get_workbench_job!(id), do: Repo.get!(WorkbenchJob, id)
  def get_workbench_job(id), do: Repo.get(WorkbenchJob, id)

  def get_workbench_job_activity!(id), do: Repo.get!(WorkbenchJobActivity, id)
  def get_workbench_job_activity(id), do: Repo.get(WorkbenchJobActivity, id)

  def get_workbench_by_name(name), do: Repo.get_by(Workbench, name: name)
  def get_workbench_by_name!(name), do: Repo.get_by!(Workbench, name: name)

  def get_workbench_tool!(id), do: Repo.get!(WorkbenchTool, id)
  def get_workbench_tool(id), do: Repo.get(WorkbenchTool, id)

  def get_workbench_tool_by_name(name), do: Repo.get_by(WorkbenchTool, name: name)
  def get_workbench_tool_by_name!(name), do: Repo.get_by!(WorkbenchTool, name: name)

  def get_workbench_cron!(id), do: Repo.get!(WorkbenchCron, id)
  def get_workbench_cron(id), do: Repo.get(WorkbenchCron, id)
  def get_workbench_prompt!(id), do: Repo.get!(WorkbenchPrompt, id)
  def get_workbench_prompt(id), do: Repo.get(WorkbenchPrompt, id)
  def get_queued_prompt!(id), do: Repo.get!(QueuedPrompt, id)
  def get_queued_prompt(id), do: Repo.get(QueuedPrompt, id)
  def get_workbench_skill!(id), do: Repo.get!(WorkbenchSkill, id)
  def get_workbench_skill(id), do: Repo.get(WorkbenchSkill, id)
  def get_workbench_webhook!(id), do: Repo.get!(WorkbenchWebhook, id)
  def get_workbench_webhook(id), do: Repo.get(WorkbenchWebhook, id)

  def get_workbench_chatbot!(id), do: Repo.get!(WorkbenchChatbot, id)
  def get_workbench_chatbot(id), do: Repo.get(WorkbenchChatbot, id)

  def get_workbench_eval!(id), do: Repo.get!(WorkbenchEval, id)
  def get_workbench_eval(id), do: Repo.get(WorkbenchEval, id)

  def get_workbench_eval_result!(id), do: Repo.get!(WorkbenchEvalResult, id)
  def get_workbench_eval_result(id), do: Repo.get(WorkbenchEvalResult, id)
  def get_workbench_policy!(id), do: Repo.get!(WorkbenchPolicy, id)
  def get_workbench_policy(id), do: Repo.get(WorkbenchPolicy, id)

  @decorate cacheable(cache: @cache_adapter, key: {:wb_policies, id}, ttl: :timer.hours(24))
  def get_workbench_policies(id) do
    WorkbenchPolicy.for_workbench(id)
    |> WorkbenchPolicy.ordered(asc: :id)
    |> Repo.all()
    |> Repo.preload(:policy)
    |> Enum.map(&WorkbenchPolicy.compile/1)
  end

  def flow_association(flow_id, workbench_id) do
    Repo.get_by(FlowWorkbench, flow_id: flow_id, workbench_id: workbench_id)
  end

  def accessible_users(%Workbench{} = workbench) do
    {users, groups} = Console.AI.Authorizable.authorize(workbench)

    User.for_policies(users, groups)
    |> Repo.all()
  end

  @doc """
  Executes a semantic search for workbench jobs indexed in the vector store.
  """
  @spec workbench_job_search(binary, User.t(), keyword) :: {:ok, [WorkbenchJob.t()]} | error
  def workbench_job_search(q, %User{} = user, opts \\ []) do
    count = Keyword.get(opts, :limit, 5)
    workbench_id = Keyword.get(opts, :workbench_id)
    user = Console.Services.Rbac.preload(user)

    with {:ok, results} <- VectorStore.fetch(q, [
           count: count,
           filters: search_filters(workbench_id),
           user: user
         ]) do
      results
      |> Enum.map(fn
        %VectorStore.Response{workbench_job: %{id: id}} when is_binary(id) -> id
        _ -> nil
      end)
      |> Enum.reject(&is_nil/1)
      |> Enum.uniq()
      |> WorkbenchJob.for_ids()
      |> Repo.all()
      |> ok()
    end
  end

  defp search_filters(workbench_id) when is_binary(workbench_id) do
    [datatype: {:raw, :workbench_job}, workbench_id: workbench_id]
  end
  defp search_filters(_), do: [datatype: {:raw, :workbench_job}]

  @doc """
  Creates or updates a workbench. If attrs contain an id, that record is updated.
  Otherwise if attrs contain a name, looks up by name and updates or creates.
  """
  @spec create_workbench(map, User.t()) :: workbench_resp
  def create_workbench(attrs, %User{} = user) do
    %Workbench{bot_user_id: user.id}
    |> Workbench.changeset(Settings.add_project_id(attrs, user))
    |> allow(user, :write)
    |> when_ok(:insert)
    |> notify(:create, user)
  end

  @doc """
  Updates a workbench.
  """
  @spec update_workbench(map, binary, User.t()) :: workbench_resp
  def update_workbench(attrs, id, %User{} = user) do
    get_workbench!(id)
    |> Repo.preload([:tool_associations, :read_bindings, :write_bindings, :workbench_skills])
    |> allow(user, :write)
    |> when_ok(&Workbench.changeset(&1, override_bot_user(attrs, user)))
    |> when_ok(:update)
    |> notify(:update, user)
  end

  defp override_bot_user(%{override_bot_user: true} = attrs, %User{id: id}),
    do: Map.put(attrs, :bot_user_id, id)
  defp override_bot_user(attrs, _), do: attrs

  defp override_webhook_user(%{override_webhook_user: true} = attrs, %User{id: id}),
    do: Map.put(attrs, :user_id, id)
  defp override_webhook_user(attrs, _), do: attrs

  defp override_chatbot_user(%{override_chatbot_user: true} = attrs, %User{id: id}),
    do: Map.put(attrs, :user_id, id)
  defp override_chatbot_user(attrs, _), do: attrs

  @doc """
  Deletes a workbench.
  """
  @spec delete_workbench(binary, User.t()) :: workbench_resp
  def delete_workbench(id, %User{} = user) do
    get_workbench!(id)
    |> allow(user, :write)
    |> when_ok(:delete)
    |> notify(:delete, user)
  end

  @doc "Creates a policy association for a workbench. Requires write access to the workbench and read access to the policy."
  @spec create_workbench_policy(map, binary, User.t()) :: workbench_policy_resp
  def create_workbench_policy(attrs, workbench_id, %User{} = user) do
    start_transaction()
    |> add_operation(:workbench_policy, fn _ ->
      %WorkbenchPolicy{workbench_id: workbench_id}
      |> WorkbenchPolicy.changeset(attrs)
      |> allow(user, :write)
      |> when_ok(:insert)
    end)
    |> add_operation(:policy, fn %{workbench_policy: workbench_policy} ->
      workbench_policy
      |> Repo.preload(:policy)
      |> Map.fetch!(:policy)
      |> allow(user, :read)
    end)
    |> execute(extract: :workbench_policy)
    |> notify(:create, user)
  end

  @doc "Updates a workbench policy association. Requires write access to the workbench and read access to its policy."
  @spec update_workbench_policy(map, binary, User.t()) :: workbench_policy_resp
  def update_workbench_policy(attrs, id, %User{} = user) do
    start_transaction()
    |> add_operation(:update, fn _ ->
      get_workbench_policy!(id)
      |> Repo.preload(:policy)
      |> WorkbenchPolicy.changeset(attrs)
      |> allow(user, :write)
      |> when_ok(:update)
    end)
    |> add_operation(:policy, fn %{update: %{policy: policy}} -> allow(policy, user, :read) end)
    |> execute(extract: :update)
    |> notify(:update, user)
  end

  @doc "Deletes a workbench policy association. Requires write access to the workbench."
  @spec delete_workbench_policy(binary, User.t()) :: workbench_policy_resp
  def delete_workbench_policy(id, %User{} = user) do
    get_workbench_policy!(id)
    |> allow(user, :write)
    |> when_ok(:delete)
    |> notify(:delete, user)
  end

  @doc "Deletes the specified policy association from a workbench. Requires write access to the workbench."
  @spec delete_workbench_policy(binary, binary, User.t()) :: workbench_policy_resp
  def delete_workbench_policy(policy_id, workbench_id, %User{} = user) do
    Repo.get_by!(WorkbenchPolicy, policy_id: policy_id, workbench_id: workbench_id)
    |> allow(user, :write)
    |> when_ok(:delete)
    |> notify(:delete, user)
  end

  @doc """
  Creates a new workbench tool.
  """
  @spec create_tool(map, User.t()) :: tool_resp
  def create_tool(attrs, %User{} = user) do
    %WorkbenchTool{}
    |> WorkbenchTool.changeset(Settings.add_project_id(attrs, user))
    |> allow(user, :write)
    |> when_ok(:insert)
    |> notify(:create, user)
  end

  @doc """
  Updates an existing workbench tool.
  """
  @spec update_tool(map, binary, User.t()) :: tool_resp
  def update_tool(attrs, id, %User{} = user) do
    get_workbench_tool!(id)
    |> Repo.preload([:read_bindings, :write_bindings])
    |> allow(user, :write)
    |> when_ok(&WorkbenchTool.changeset(&1, attrs))
    |> when_ok(:update)
    |> notify(:update, user)
  end

  @doc """
  Deletes a workbench tool.
  """
  @spec delete_tool(binary, User.t()) :: tool_resp
  def delete_tool(id, %User{} = user) do
    get_workbench_tool!(id)
    |> allow(user, :write)
    |> when_ok(:delete)
    |> notify(:delete, user)
  end

  @doc """
  Creates or updates a workbench cron. If attrs contain an id for an existing cron
  on the workbench, that record is updated. Otherwise a new cron is created.
  Requires write permission on the workbench.
  """
  @spec create_workbench_cron(map, binary, User.t()) :: cron_resp
  def create_workbench_cron(attrs, workbench_id, %User{id: uid} = user) do
    start_transaction()
    |> add_operation(:cron, fn _ ->
      %WorkbenchCron{workbench_id: workbench_id, user_id: uid}
      |> WorkbenchCron.changeset(attrs)
      |> allow(user, :write)
      |> when_ok(:insert)
    end)
    |> add_operation(:actor, fn %{cron: cron} -> actor_access(cron, user) end)
    |> execute(extract: :cron)
    |> notify(:create, user)
  end

  @doc """
  Updates a workbench cron. Requires write permission on the workbench.
  """
  @spec update_workbench_cron(map, binary, User.t()) :: cron_resp
  def update_workbench_cron(attrs, id, %User{} = user) do
    start_transaction()
    |> add_operation(:cron, fn _ ->
      get_workbench_cron!(id)
      |> WorkbenchCron.changeset(attrs)
      |> allow(user, :write)
      |> when_ok(:update)
    end)
    |> add_operation(:actor, fn %{cron: cron} -> actor_access(cron, user) end)
    |> execute(extract: :cron)
    |> notify(:update, user)
  end

  @doc """
  Deletes a workbench cron. Requires write permission on the workbench.
  """
  @spec delete_workbench_cron(binary, User.t()) :: cron_resp
  def delete_workbench_cron(id, %User{} = user) do
    get_workbench_cron!(id)
    |> allow(user, :write)
    |> when_ok(:delete)
    |> notify(:delete, user)
  end

  @doc """
  Fetches a workbench cron by id. Requires read permission on the workbench.
  """
  @spec fetch_workbench_cron(binary, User.t()) :: cron_resp
  def fetch_workbench_cron(id, %User{} = user) do
    get_workbench_cron!(id)
    |> allow(user, :read)
  end

  @doc """
  Creates a saved prompt for a workbench. Requires read access to the workbench.
  """
  @spec create_workbench_prompt(map, binary, User.t()) :: prompt_resp
  def create_workbench_prompt(attrs, workbench_id, %User{} = user) do
    with {:ok, attrs} <- backfill_prompt_attrs(attrs) do
      %WorkbenchPrompt{workbench_id: workbench_id}
      |> WorkbenchPrompt.changeset(attrs)
      |> allow(user, :read)
      |> when_ok(:insert)
      |> notify(:create, user)
    end
  end

  defp backfill_prompt_attrs(%{title: t, category: c} = attrs) when is_binary(t) and is_binary(c), do: {:ok, attrs}
  defp backfill_prompt_attrs(%{prompt: p} = attrs) do
    [{:user, "I need to generate a decent title and category to describe the following saved prompt:\n```\n#{p}\n```\nUse the given tool to do it for me."}]
    |> Provider.simple_tool_call(SavedPrompt)
    |> case do
      {:ok, %SavedPrompt{title: t, category: c}} -> {:ok, Map.merge(attrs, %{title: t, category: c})}
      err -> err
    end
  end
  defp backfill_prompt_attrs(_), do: {:error, "you need to at least provide a prompt to create a workbench prompt"}

  @doc """
  Updates a saved workbench prompt. Requires read access to the workbench.
  """
  @spec update_workbench_prompt(map, binary, User.t()) :: prompt_resp
  def update_workbench_prompt(attrs, id, %User{} = user) do
    get_workbench_prompt!(id)
    |> WorkbenchPrompt.changeset(attrs)
    |> allow(user, :read)
    |> when_ok(:update)
    |> notify(:update, user)
  end

  @doc """
  Deletes a saved workbench prompt. Requires read access to the workbench.
  """
  @spec delete_workbench_prompt(binary, User.t()) :: prompt_resp
  def delete_workbench_prompt(id, %User{} = user) do
    get_workbench_prompt!(id)
    |> allow(user, :read)
    |> when_ok(:delete)
    |> notify(:delete, user)
  end

  @doc """
  Fetches a saved workbench prompt by id. Requires read permission on the workbench.
  """
  @spec fetch_workbench_prompt(binary, User.t()) :: prompt_resp
  def fetch_workbench_prompt(id, %User{} = user) do
    get_workbench_prompt!(id)
    |> allow(user, :read)
  end

  @doc """
  Creates a saved workbench skill. Requires write access to the workbench.
  """
  @spec create_workbench_skill(map, binary, User.t()) :: skill_resp
  def create_workbench_skill(attrs, workbench_id, %User{} = user) do
    %WorkbenchSkill{workbench_id: workbench_id}
    |> WorkbenchSkill.changeset(attrs)
    |> allow(user, :write)
    |> when_ok(:insert)
    |> notify(:create, user)
  end

  @doc """
  Updates a saved workbench skill. Requires write access to the workbench.
  """
  @spec update_workbench_skill(map, binary, User.t()) :: skill_resp
  def update_workbench_skill(attrs, id, %User{} = user) do
    get_workbench_skill!(id)
    |> WorkbenchSkill.changeset(attrs)
    |> allow(user, :write)
    |> when_ok(:update)
    |> notify(:update, user)
  end

  @doc """
  Deletes a saved workbench skill. Requires write access to the workbench.
  """
  @spec delete_workbench_skill(binary, User.t()) :: skill_resp
  def delete_workbench_skill(id, %User{} = user) do
    get_workbench_skill!(id)
    |> allow(user, :write)
    |> when_ok(:delete)
    |> notify(:delete, user)
  end

  @doc """
  Creates a workbench eval configuration for a workbench. Requires write access to the workbench.
  At most one eval exists per workbench (enforced by a unique index).
  """
  @spec create_workbench_eval(map, binary, User.t()) :: eval_resp
  def create_workbench_eval(attrs, workbench_id, %User{} = user) do
    %WorkbenchEval{workbench_id: workbench_id}
    |> WorkbenchEval.changeset(attrs)
    |> allow(user, :write)
    |> when_ok(:insert)
    |> notify(:create, user)
  end

  @doc """
  Updates a workbench eval. Requires write access to the workbench.
  """
  @spec update_workbench_eval(map, binary, User.t()) :: eval_resp
  def update_workbench_eval(attrs, id, %User{} = user) do
    get_workbench_eval!(id)
    |> WorkbenchEval.changeset(attrs)
    |> allow(user, :write)
    |> when_ok(:update)
    |> notify(:update, user)
  end

  @doc """
  Deletes a workbench eval. Requires write access to the workbench.
  """
  @spec delete_workbench_eval(binary, User.t()) :: eval_resp
  def delete_workbench_eval(id, %User{} = user) do
    get_workbench_eval!(id)
    |> allow(user, :write)
    |> when_ok(:delete)
    |> notify(:delete, user)
  end

  @doc """
  Fetches a workbench eval by id. Requires read permission on the workbench.
  """
  @spec fetch_workbench_eval(binary, User.t()) :: eval_resp
  def fetch_workbench_eval(id, %User{} = user) do
    get_workbench_eval!(id)
    |> allow(user, :read)
  end

  @doc """
  Runs an agent on an eval result to update the workbench skills as necessary based on its findings.
  """
  @spec workbench_eval_skill(binary | WorkbenchEvalResult.t(), prompt :: binary | nil, User.t()) :: job_resp
  def workbench_eval_skill(%WorkbenchEvalResult{workbench_job_id: job_id} = eval, prompt, %User{} = user) do
    eval = Repo.preload(eval, [:workbench_job])
    create_workbench_job(%{
      prompt: prompt || "Update the skills as necessary",
      referenced_job_id: job_id,
      type: :skill
    }, get_workbench!(eval.workbench_job.workbench_id), user)
  end

  def workbench_eval_skill(result_id, prompt, %User{} = user) when is_binary(result_id) do
    get_workbench_eval_result!(result_id)
    |> workbench_eval_skill(prompt, user)
  end

  @doc """
  Infers a skill for a job based on the job's conclusion and prompt.
  """
  @spec infer_skill(WorkbenchJob.t() | binary, User.t()) :: job_resp
  def infer_skill(%WorkbenchJob{} = job, %User{} = user) do
    create_workbench_job(%{
      prompt: "No specific guidance provided, update the skills as necessary",
      referenced_job_id: job.id,
      type: :skill
    }, get_workbench!(job.workbench_id), Console.Services.Rbac.preload(user))
  end

  def infer_skill(job_id, user) when is_binary(job_id) do
    get_workbench_job!(job_id)
    |> infer_skill(user)
  end

  @doc """
  Lists all webhooks for a workbench, this view is cached.
  """
  @decorate cacheable(cache: @cache_adapter, key: {:wb_webhooks, webhook_id}, opts: [ttl: @ttl])
  def list_workbench_webhooks(webhook_id) do
    WorkbenchWebhook.for_webhook(webhook_id)
    |> WorkbenchWebhook.prioritized()
    |> Repo.all()
  end

  @decorate cacheable(cache: @cache_adapter, key: {:wb_webhooks_for_issue, issue_webhook_id}, opts: [ttl: @ttl])
  def list_workbench_webhooks_for_issue(issue_webhook_id) do
    WorkbenchWebhook.for_issue_webhook(issue_webhook_id)
    |> WorkbenchWebhook.prioritized()
    |> Repo.all()
  end

  @decorate cacheable(cache: @cache_adapter, key: {:wb_chatbot, chat_conn_id, channel}, opts: [ttl: @ttl])
  def workbench_chatbot(chat_conn_id, channel) do
    Repo.get_by(WorkbenchChatbot, chat_connection_id: chat_conn_id, channel: channel)
  end

  @doc """
  Creates or updates a workbench webhook. If attrs contain an id for an existing
  webhook on the workbench, that record is updated. Otherwise if attrs contain
  workbench_id and name, looks up by name and updates or creates.
  Requires write permission on the workbench.
  """
  @spec create_workbench_webhook(map, binary, User.t()) :: webhook_resp
  def create_workbench_webhook(attrs, workbench_id, %User{id: uid} = user) do
    start_transaction()
    |> add_operation(:webhook, fn _ ->
      %WorkbenchWebhook{workbench_id: workbench_id, user_id: uid}
      |> WorkbenchWebhook.changeset(attrs)
      |> allow(user, :write)
      |> when_ok(:insert)
    end)
    |> add_operation(:access, fn %{webhook: hook} -> hook_access(hook, user) end)
    |> add_operation(:actor, fn %{webhook: hook} -> actor_access(hook, user) end)
    |> execute(extract: :webhook)
    |> notify(:create, user)
  end

  @doc """
  Updates a workbench webhook. Requires write permission on the workbench.
  """
  @spec update_workbench_webhook(map, binary, User.t()) :: webhook_resp
  def update_workbench_webhook(attrs, id, %User{} = user) do
    start_transaction()
    |> add_operation(:webhook, fn _ ->
      get_workbench_webhook!(id)
      |> allow(user, :write)
      |> when_ok(&WorkbenchWebhook.changeset(&1, override_webhook_user(attrs, user)))
      |> when_ok(:update)
    end)
    |> add_operation(:access, fn %{webhook: hook} -> hook_access(hook, user) end)
    |> add_operation(:actor, fn %{webhook: hook} -> actor_access(hook, user) end)
    |> execute(extract: :webhook)
    |> notify(:update, user)
  end

  defp hook_access(%WorkbenchWebhook{} = hook, %User{} = user) do
    Repo.preload(hook, [:webhook, :issue_webhook])
    |> case do
      %WorkbenchWebhook{webhook: %ObservabilityWebhook{} = hook} -> allow(hook, user, :read)
      %WorkbenchWebhook{issue_webhook: %IssueWebhook{} = hook} -> allow(hook, user, :read)
      _ -> {:error, "workbench webhook does not have an observability webhook or issue webhook"}
    end
  end

  defp actor_access(%mod{} = assoc, %User{roles: %{admin: true}}) when mod in [WorkbenchWebhook, WorkbenchChatbot, WorkbenchCron] do
    Repo.preload(assoc, [user: :groups, workbench: [:read_bindings, :write_bindings, project: [:read_bindings, :write_bindings]]])
    |> case do
      %^mod{user: %User{} = user, workbench: %Workbench{} = workbench} ->
        allow(workbench, user, :read)
      _ -> {:error, "workbench #{mod} does not have a user and workbench"}
    end
  end
  defp actor_access(%mod{user_id: id} = assoc, %User{id: id}) when mod in [WorkbenchWebhook, WorkbenchChatbot, WorkbenchCron],
    do: {:ok, assoc}
  defp actor_access(_, _), do: {:error, "invalid association type"}

  @doc """
  Deletes a workbench webhook. Requires write permission on the workbench.
  """
  @spec delete_workbench_webhook(binary, User.t()) :: webhook_resp
  def delete_workbench_webhook(id, %User{} = user) do
    get_workbench_webhook!(id)
    |> allow(user, :write)
    |> when_ok(:delete)
    |> notify(:delete, user)
  end

  @doc """
  Creates a workbench chatbot binding (workbench + chat connection + channel).
  Requires write permission on the workbench and read access to the chat connection.
  """
  @spec create_workbench_chatbot(map, binary, User.t()) :: chatbot_resp
  def create_workbench_chatbot(attrs, workbench_id, %User{id: uid} = user) do
    start_transaction()
    |> add_operation(:chatbot, fn _ ->
      %WorkbenchChatbot{workbench_id: workbench_id, user_id: uid}
      |> WorkbenchChatbot.changeset(attrs)
      |> allow(user, :write)
      |> when_ok(:insert)
    end)
    |> add_operation(:access, fn %{chatbot: bot} -> chat_connection_access(bot, user) end)
    |> add_operation(:actor, fn %{chatbot: bot} -> actor_access(bot, user) end)
    |> execute(extract: :chatbot)
    |> notify(:create, user)
  end

  @doc """
  Updates a workbench chatbot. Requires write permission on the workbench and read access to the chat connection.
  """
  @spec update_workbench_chatbot(map, binary, User.t()) :: chatbot_resp
  def update_workbench_chatbot(attrs, id, %User{} = user) do
    start_transaction()
    |> add_operation(:chatbot, fn _ ->
      get_workbench_chatbot!(id)
      |> allow(user, :write)
      |> when_ok(&WorkbenchChatbot.changeset(&1, override_chatbot_user(attrs, user)))
      |> when_ok(:update)
    end)
    |> add_operation(:access, fn %{chatbot: bot} -> chat_connection_access(bot, user) end)
    |> add_operation(:actor, fn %{chatbot: bot} -> actor_access(bot, user) end)
    |> execute(extract: :chatbot)
    |> notify(:update, user)
  end

  defp chat_connection_access(%WorkbenchChatbot{} = bot, %User{} = user) do
    Repo.preload(bot, [:chat_connection])
    |> case do
      %WorkbenchChatbot{chat_connection: %ChatConnection{} = conn} -> allow(conn, user, :read)
      _ -> {:error, "workbench chatbot does not have a chat connection"}
    end
  end

  @doc """
  Deletes a workbench chatbot. Requires write permission on the workbench.
  """
  @spec delete_workbench_chatbot(binary, User.t()) :: chatbot_resp
  def delete_workbench_chatbot(id, %User{} = user) do
    get_workbench_chatbot!(id)
    |> allow(user, :write)
    |> when_ok(:delete)
    |> notify(:delete, user)
  end

  @whimsey_prompt "Ok generate a clever and whimsical (but not fantastical) phrase to describe the current thing you're working in at most 5 words.  If there are no activities, just base it off the original job prompt."

  def whimsey_text(%WorkbenchJob{} = job) do
    job = Repo.preload(job, [:activities])
    Console.AI.Provider.completion([{:user, @whimsey_prompt}], preface: String.trim(whimsey_prompt(job: job)))
  end

  def whimsey_text(%WorkbenchJobActivity{type: :coding} = activity) do
    activity = Repo.preload(activity, [:thoughts, agent_runs: :pull_requests])
    Console.AI.Provider.completion([{:user, @whimsey_prompt}], preface: String.trim(whimsey_activity_prompt(activity: activity)))
  end

  def whimsey_text(%WorkbenchJobActivity{} = activity) do
    Repo.preload(activity, [:thoughts])
    |> Map.put(:agent_runs, [])
    |> then(&Console.AI.Provider.completion([{:user, @whimsey_prompt}], preface: String.trim(whimsey_activity_prompt(activity: &1))))
  end

  EEx.function_from_file(:defp, :whimsey_activity_prompt, Console.priv_filename(["prompts", "workbench", "whimsey_activity.md.eex"]), [:assigns])
  EEx.function_from_file(:defp, :whimsey_prompt, Console.priv_filename(["prompts", "workbench", "whimsey.md.eex"]), [:assigns])

  @doc """
  Creates a new workbench job for a workbench. Requires read access to the workbench.
  """
  @spec create_workbench_job(map, binary | Workbench.t(), User.t()) :: job_resp
  def create_workbench_job(attrs, %Workbench{id: wid}, %User{} = user),
    do: create_workbench_job(attrs, wid, user)
  def create_workbench_job(attrs, id, %User{} = user) when is_binary(id) do
    start_transaction()
    |> add_operation(:budget, fn _ ->
      bench = get_workbench_with_lock!(id)
      case budget_available?(bench) do
        true -> {:ok, bench}
        false -> {:error, "workbench budget is exhausted"}
      end
    end)
    |> add_operation(:job, fn %{budget: %Workbench{id: wb_id} = wb} ->
      %WorkbenchJob{user_id: user.id, workbench_id: wb_id}
      |> WorkbenchJob.changeset(
        attrs
        |> merge_modes(wb.modes, wb)
        |> Map.put(:result, %{working_theory: "", conclusion: ""})
      )
      |> allow(user, :read)
      |> when_ok(:insert)
    end)
    |> execute(extract: :job)
    |> notify(:create, user)
  end

  defp merge_modes(attrs, base_modes, %Workbench{modes: workbench_modes}) do
    base_modes
    |> then(&Console.mapify(&1 || %{}))
    |> DeepMerge.deep_merge(compact_modes(attrs[:modes] || %{}))
    |> restrict_kubernetes_modes(Console.mapify(workbench_modes || %{}))
    |> then(&Map.put(attrs, :modes, &1))
  end

  defp compact_modes(%{} = modes) do
    modes
    |> Console.mapify()
    |> Enum.reject(fn {_, value} -> is_nil(value) end)
    |> Map.new(fn {key, value} -> {key, compact_modes(value)} end)
  end
  defp compact_modes(value), do: value

  defp restrict_kubernetes_modes(%{kubernetes: %{} = job_modes} = modes, workbench_modes) do
    wb_kubernetes = Map.get(workbench_modes, :kubernetes, %{})

    kubernetes =
      job_modes
      |> Map.put(:update, job_modes[:update] && wb_kubernetes[:update])
      |> Map.put(:delete, job_modes[:delete] && wb_kubernetes[:delete])

    %{modes | kubernetes: kubernetes}
  end
  defp restrict_kubernetes_modes(modes, _), do: modes

  defp budget_available?(%Workbench{budget: %Budget{} = budget}), do: Budget.available?(budget)
  defp budget_available?(%Workbench{}), do: true

  def create_workbench_bot_job(attrs, workbench_id, %WorkbenchWebhook{modes: modes} = hook) do
    hook = Repo.preload(hook, [:user])
    bench = get_workbench!(workbench_id) |> Repo.preload([:bot_user])
    start_transaction()
    |> add_operation(:actor, fn _ ->
      case {hook, bench} do
        {%WorkbenchWebhook{user: %User{} = user}, _} -> {:ok, Console.Services.Rbac.preload(user)}
        {_, %Workbench{bot_user: %User{} = bot_user}} -> {:ok, Console.Services.Rbac.preload(bot_user)}
        _ -> {:error, "workbench webhook does not have a bot user"}
      end
    end)
    |> add_operation(:job, fn %{actor: user} ->
      Map.put(attrs, :modes, Console.mapify(modes))
      |> create_workbench_job(bench, user)
    end)
    |> execute(extract: :job)
  end

  @doc """
  Updates a workbench job. Requires read access to the workbench.
  """
  @spec update_workbench_job(map, WorkbenchJob.t() | binary, User.t()) :: job_resp
  def update_workbench_job(attrs, %WorkbenchJob{} = job, %User{} = user) do
    Repo.preload(job, :result)
    |> WorkbenchJob.update_changeset(attrs)
    |> allow(user, :edit)
    |> when_ok(:update)
    |> notify(:update, user)
  end
  def update_workbench_job(attrs, id, user) when is_binary(id) do
    get_workbench_job!(id)
    |> then(&update_workbench_job(attrs, &1, user))
  end
  def update_workbench_job(_, _, _), do: {:error, "you can only update your own jobs"}

  @doc """
  Cancels a workbench job. Requires write access to the job, or for the user to be the owner of the job.
  """
  @spec cancel_workbench_job(binary, User.t()) :: job_resp
  def cancel_workbench_job(id, %User{} = user) do
    start_transaction()
    |> add_operation(:job, fn _ ->
      get_workbench_job!(id)
      |> WorkbenchJob.changeset(%{status: :cancelled})
      |> allow(user, :edit)
      |> when_ok(:update)
    end)
    |> add_operation(:heartbeat, fn %{job: job} ->
      Console.AI.Workbench.Router.stop(job)
      {:ok, job}
    end)
    |> execute(extract: :job)
    |> notify(:update, user)
  end

  @doc """
  Fails a workbench job. Requires write access to the job, or for the user to be the owner of the job.
  """
  @spec fail_job(WorkbenchJob.t()) :: job_resp
  def fail_job(%WorkbenchJob{} = job) do
    job
    |> WorkbenchJob.changeset(%{status: :failed})
    |> Repo.update()
    |> notify(:update)
  end

  @doc """
  Kicks a job by updating the updated_at timestamp to 20 minutes ago.
  """
  @spec kick_job(WorkbenchJob.t() | binary, User.t()) :: job_resp
  def kick_job(%WorkbenchJob{user_id: id} = job, %User{id: id}) do
    job
    |> Ecto.Changeset.change(%{updated_at: Timex.now() |> Timex.shift(minutes: -20)})
    |> Repo.update()
    |> notify(:update)
  end
  def kick_job(id, user) when is_binary(id) do
    get_workbench_job!(id)
    |> kick_job(user)
  end
  def kick_job(_, _), do: {:error, "you can only kick your own jobs"}

  @doc """
  Requeues an inactive workbench job for processing.
  """
  @spec resume_job(WorkbenchJob.t()) :: job_resp
  def resume_job(%WorkbenchJob{status: status} = job) when status != :running do
    job
    |> WorkbenchJob.changeset(%{status: :pending})
    |> Repo.update()
    |> notify(:update)
  end
  def resume_job(%WorkbenchJob{} = job), do: {:ok, job}

  @doc """
  Marks a workbench job as paused, and cancels its activities so they can be restarted later.
  """
  @spec pause_job(WorkbenchJob.t()) :: job_resp
  def pause_job(%WorkbenchJob{} = job, usage \\ %{}) do
    start_transaction()
    |> add_operation(:job, fn _ ->
      job
      |> WorkbenchJob.changeset(%{status: :paused, usage: usage})
      |> Repo.update()
    end)
    |> add_operation(:activities, fn _ ->
      WorkbenchJobActivity.for_workbench_job(job.id)
      |> WorkbenchJobActivity.for_status(:running)
      |> Repo.update_all(set: [status: :cancelled])
      |> ok()
    end)
    |> execute(extract: :job)
    |> notify(:update)
  end

  @doc """
  Heartbeats a job by setting status to running and updating the updated_at timestamp to the current time.
  """
  @spec heartbeat(WorkbenchJob.t(), boolean) :: job_resp
  def heartbeat(%WorkbenchJob{id: id}, boot \\ false) do
    case {get_workbench_job!(id), boot} do
      {job, true} -> mark_running(job)
      {%WorkbenchJob{status: s} = job, _} when s in ~w(successful failed cancelled)a -> {:ok, job}
      {job, _} -> mark_running(job)
    end
  end

  defp mark_running(%WorkbenchJob{} = job) do
    job
    |> Ecto.Changeset.change(%{status: :running, updated_at: Timex.now()})
    |> Repo.update(allow_stale: true)
  end

  @doc """
  Creates a new message for a job. Requires read access to the job.
  """
  @spec create_message(map, binary, User.t()) :: activity_resp
  def create_message(attrs, %WorkbenchJob{} = job, %User{} = user) do
    start_transaction()
    |> add_operation(:idle, fn _ ->
      case WorkbenchJob.idle?(job) do
        true -> {:ok, job}
        false -> {:error, "job is currently active, please wait for it to complete before prompting"}
      end
    end)
    |> add_operation(:job, fn %{idle: job} ->
      job = Repo.preload(job, [:result, :workbench], force: true)
      with {:ok, job} <- allow(job, user, :prompt) do
        %{
          status: :pending,
          error: nil,
          user_id: user.id,
          modes: attrs[:modes],
          result: %{todos: []}
        }
        |> merge_modes(job.modes, job.workbench)
        |> then(&WorkbenchJob.changeset(job, &1))
        |> Repo.update()
      end
    end)
    |> add_operation(:activity, fn %{job: job} ->
      %WorkbenchJobActivity{
        workbench_job_id: job.id,
        type: :user,
        user_id: user.id,
        status: :successful
      }
      |> WorkbenchJobActivity.changeset(attrs)
      |> Repo.insert()
    end)
    |> execute(extract: :activity)
    |> notify(:create, user)
  end

  def create_message(attrs, id, %User{} = user) when is_binary(id) do
    get_workbench_job!(id)
    |> then(&create_message(attrs, &1, user))
  end

  @doc """
  Queues a prompt to be sent to a workbench job after `dequeable_at`.
  Requires read/prompt access to the target job.
  """
  @spec create_queued_prompt(map, binary | WorkbenchJob.t(), User.t()) :: queued_prompt_resp
  def create_queued_prompt(attrs, %WorkbenchJob{id: job_id}, %User{id: user_id} = user) do
    %QueuedPrompt{workbench_job_id: job_id, user_id: user_id}
    |> QueuedPrompt.changeset(attrs)
    |> allow(user, :read)
    |> when_ok(:insert)
    |> notify(:create, user)
  end

  def create_queued_prompt(attrs, job_id, %User{} = user) when is_binary(job_id) do
    get_workbench_job!(job_id)
    |> then(&create_queued_prompt(attrs, &1, user))
  end

  @doc """
  Deletes a queued prompt before or after it has been consumed.
  Requires read/prompt access to the target job.
  """
  @spec delete_queued_prompt(binary, User.t()) :: queued_prompt_resp
  def delete_queued_prompt(id, %User{} = user) do
    get_queued_prompt!(id)
    |> allow(user, :read)
    |> when_ok(:delete)
  end

  @spec dequeue_prompt(QueuedPrompt.t()) :: activity_resp
  def dequeue_prompt(%QueuedPrompt{} = prompt) do
    %{user: user, workbench_job: job} = Repo.preload(prompt, [workbench_job: :workbench, user: [:groups]])

    start_transaction()
    |> add_operation(:consume, fn _ ->
      prompt
      |> QueuedPrompt.changeset(%{consumed_at: DateTime.utc_now()})
      |> Repo.update()
    end)
    |> add_operation(:job, fn %{consume: prompt} ->
      create_message(%{
        prompt: prompt.prompt,
        modes: prompt.modes
      }, job, user)
    end)
    |> execute(extract: :job)
  end

  def kick_workbench(%StackRun{status: :successful, id: id} = run) do
    run = Repo.preload(run, :stack)
    WorkbenchJob.for_stack_run(id)
    |> WorkbenchJob.with_limit(1)
    |> Repo.one()
    |> case do
      %WorkbenchJob{modes: %{verification: true}} = job ->
        %PullRequest{} = pr = PullRequest.for_stack_run(id)
                              |> Repo.one!()
        create_queued_prompt(%{
          prompt: String.trim(stack_run_verification_prompt(pr: pr, run: run)),
          dequeable_at: DateTime.utc_now()
        },  job, Users.get_bot!("console"))

      %{} -> {:error, "verification mode is not enabled for this job"}
      nil -> {:error, "no workbench job found for stack run #{id}"}
    end
  end

  def kick_workbench(%PullRequest{status: :merged, service: %Service{} = svc, workbench_job_id: id} = pr)
      when is_binary(id) do
    case Repo.preload(pr, [workbench_job: [user: :groups]]) do
      %PullRequest{workbench_job: %WorkbenchJob{modes: %{verification: true}} = job} ->
        create_queued_prompt(%{
          prompt: String.trim(service_verification_prompt(pr: pr, svc: svc)),
          dequeable_at: DateTime.add(DateTime.utc_now(), 15, :minute)
        }, job, job.user)
      _ -> {:error, "verification mode is not enabled for this job"}
    end
  end

  def kick_workbench(_), do: :ok

  EEx.function_from_file(
    :defp,
    :stack_run_verification_prompt,
    "priv/prompts/workbench/stack_run_verification.md.eex",
    [:assigns]
  )

  EEx.function_from_file(
    :defp,
    :service_verification_prompt,
    "priv/prompts/workbench/service_verification.md.eex",
    [:assigns]
  )

  @doc """
  Creates a new message for the job associated with a pull request.
  """
  @spec pr_followup(map, binary, User.t()) :: activity_resp
  def pr_followup(attrs, url, %User{} = user) do
    Repo.get_by(PullRequest, url: url)
    |> Repo.preload([:workbench_job])
    |> case do
      %PullRequest{workbench_job: %WorkbenchJob{} = job} ->
        create_message(attrs, job, user)
      _ ->
        {:error, "pull request not found"}
    end
  end

  @doc """
  Queues a prompt for the job associated with a pull request.
  """
  @spec pr_queued_prompt(map, binary, User.t()) :: queued_prompt_resp
  def pr_queued_prompt(attrs, url, %User{} = user) do
    Repo.get_by(PullRequest, url: url)
    |> Repo.preload([:workbench_job])
    |> case do
      %PullRequest{workbench_job: %WorkbenchJob{} = job} ->
        create_queued_prompt(attrs, job, user)
      _ ->
        {:error, "pull request not found"}
    end
  end

  @doc """
  Creates a new activity for a job, and bookkeeps job status and timestamp.
  """
  @spec create_job_activity(map, WorkbenchJob.t()) :: activity_resp
  def create_job_activity(attrs, %WorkbenchJob{} = job) do
    start_transaction()
    |> add_operation(:activity, fn _ ->
      %WorkbenchJobActivity{workbench_job_id: job.id}
      |> WorkbenchJobActivity.changeset(attrs)
      |> Repo.insert()
    end)
    |> add_operation(:job, fn _ ->
      Ecto.Changeset.change(job, %{status: :running, updated_at: DateTime.utc_now()})
      |> Repo.update()
    end)
    |> execute(extract: :activity)
    |> notify(:create)
  end

  @doc """
  Updates an existing activity for a job.
  """
  @spec update_job_activity(map, WorkbenchJobActivity.t()) :: activity_resp
  def update_job_activity(attrs, %WorkbenchJobActivity{} = activity) do
    activity
    |> WorkbenchJobActivity.changeset(attrs)
    |> Repo.update()
    |> notify(:update)
  end

  @doc """
  Approves and calls a workbench function call encapsulated in the current activity.

  Atomically claims the activity as running before invoking the external action so
  concurrent approvals cannot execute it twice and no database lock is held during
  network I/O.
  """
  @spec approve_job_activity(binary, User.t()) :: activity_resp
  def approve_job_activity(activity_id, %User{} = user) when is_binary(activity_id) do
    start_transaction()
    |> add_operation(:activity, fn _ ->
      lock_job_activity!(activity_id)
      |> allow(user, :approve)
    end)
    |> add_operation(:claim, fn
      %{activity: %WorkbenchJobActivity{type: type} = activity} when is_action(type) ->
        WorkbenchJobActivity.changeset(activity, %{
          status: :running,
          user_id: user.id
        })
        |> Repo.update()
      _ -> {:error, "activity does not support action approval"}
    end)
    |> execute(extract: :claim)
    |> when_ok(&execute_approved_activity(&1, user))
    |> notify(:update)
  end

  defp execute_approved_activity(
    %WorkbenchJobActivity{type: :function, result: %{function_call: %{} = call}} = activity,
    _user
  ) do
    get_workbench_tool!(call.tool_id)
    |> FunctionCall.call_function(call.input)
    |> case do
      {:ok, output} ->
        WorkbenchJobActivity.changeset(activity, %{status: :successful, result: %{output: output}})
      {:error, err} ->
        WorkbenchJobActivity.changeset(activity, %{
          status: :failed,
          result: %{error: "Internal function calling error: #{inspect(err)}"}
        })
    end
    |> Repo.update()
  end

  defp execute_approved_activity(
    %WorkbenchJobActivity{type: :exec, result: %{kube_exec: %KubeShell{} = shell}} = activity,
    user
  ) do
    Task.Supervisor.start_child(Console.AI.TaskSupervisor, fn ->
      case KubeShell.invoke(%{shell | activity: activity}, user) do
        {:ok, result} ->
          WorkbenchJobActivity.changeset(activity, %{status: :successful, result: %{output: result}})
        {:error, err} ->
          WorkbenchJobActivity.changeset(activity, %{
            status: :failed,
            result: %{error: "Kubernetes shell execution failed: #{inspect(err)}"}
          })
      end
      |> Repo.update()
      |> notify(:update)
    end)

    {:ok, activity}
  end

  defp execute_approved_activity(
    %WorkbenchJobActivity{type: :kubernetes, result: %{kube_request: %KubeRequest{} = request}} = activity,
    user
  ) do
    case KubeRequest.invoke(request, user) do
      {:ok, %{} = output} ->
        output
        |> KUtils.sanitize_kube_resource()
        |> KUtils.redact_secret()
        |> JSON.encode!()
        |> then(&WorkbenchJobActivity.changeset(activity, %{status: :successful, result: %{output: &1}}))
      {:error, {:http_error, _, %{"message" => msg}}} ->
        WorkbenchJobActivity.changeset(activity, %{
          status: :failed,
          result: %{error: "K8s request failed: #{msg}"}
        })
      {:error, {:http_error, _, err}} ->
        WorkbenchJobActivity.changeset(activity, %{
          status: :failed,
          result: %{error: "K8s request failed: #{inspect(err)}"}
        })
      {:error, err} ->
        WorkbenchJobActivity.changeset(activity, %{
          status: :failed,
          result: %{error: "Internal kubernetes request error: #{inspect(err)}"}
        })
    end
    |> Repo.update()
  end

  defp execute_approved_activity(_, _),
    do: {:error, "activity does not support function calling"}

  def auto_approve_activity(%WorkbenchJobActivity{id: id, result: %{auto_approve: true}}, %User{} = user),
    do: approve_job_activity(id, user)
  def auto_approve_activity(%WorkbenchJobActivity{} = activity, _), do: {:ok, activity}

  @doc """
  Rejects a job activity by marking it rejected and setting the output to the reason.

  Locks the activity row for update and re-checks needs_approval before writing so a
  concurrent approve cannot be overwritten by a stale reject (or vice versa).
  """
  @spec reject_job_activity(binary | nil, binary, User.t()) :: activity_resp
  def reject_job_activity(reason \\ nil, activity_id, %User{} = user) when is_binary(activity_id) do
    start_transaction()
    |> add_operation(:activity, fn _ ->
      lock_job_activity!(activity_id)
      |> allow(user, :approve)
    end)
    |> add_operation(:reject, fn
      %{activity: %WorkbenchJobActivity{status: :needs_approval} = activity} ->
        WorkbenchJobActivity.changeset(activity, %{
          status: :rejected,
          user_id: user.id,
          result: %{output: reason || "Execution rejected by user"}
        })
        |> Repo.update()
      _ ->
        {:error, "activity must be in needs approval status to be approved"}
    end)
    |> execute(extract: :reject)
    |> notify(:update)
  end

  defp lock_job_activity!(id),
    do: Repo.get!(WorkbenchJobActivity.with_lock(), id)

  @doc """
  Associates an agent run with a workbench activity: inserts the join row (idempotent) and sets
  `agent_run_id` and `status: :running` on the activity.
  """
  @spec associate_agent_run(WorkbenchJobActivity.t(), binary) :: activity_resp
  def associate_agent_run(%WorkbenchJobActivity{} = activity, run_id) when is_binary(run_id) do
    start_transaction()
    |> add_operation(:association, fn _ ->
      %WorkbenchJobActivityAgentRun{}
      |> WorkbenchJobActivityAgentRun.changeset(%{
        workbench_job_activity_id: activity.id,
        agent_run_id: run_id
      })
      |> Repo.insert(on_conflict: :nothing, conflict_target: [:workbench_job_activity_id, :agent_run_id])
    end)
    |> add_operation(:activity, fn _ ->
      activity
      |> WorkbenchJobActivity.changeset(%{status: :running, agent_run_id: run_id})
      |> Repo.update()
    end)
    |> execute(extract: :activity)
    |> notify(:update)
  end

  @doc """
  Saves a list of canvas blocks to a job activity.
  """
  @spec save_canvas([map], binary,  WorkbenchJobActivity.t()) :: {:ok, WorkbenchJobActivity.t(), WorkbenchJob.t()} | {:error, any()}
  def save_canvas(blocks, output, %WorkbenchJobActivity{} = activity) when is_list(blocks) do
    %WorkbenchJobActivity{workbench_job: %WorkbenchJob{} = job} =
      Repo.preload(activity, workbench_job: :result)

    blocks = Console.mapify(blocks)

    start_transaction()
    |> add_operation(:activity, fn _ ->
      update_job_activity(%{status: :successful, result: %{output: output, canvas: blocks}}, activity)
    end)
    |> add_operation(:job, fn _ ->
      job
      |> WorkbenchJob.changeset(%{result: %{canvas: blocks}})
      |> Repo.update()
    end)
    |> execute()
    |> case do
      {:ok, %{activity: activity, job: job}} ->
        notify({:ok, job}, :update)
        {:ok, activity, job}
      err -> err
    end
  end

  @doc """
  Updates the status of a job, and creates a new recording the change made.
  """
  @spec update_job_status(%{status: map, prompt: binary, output: binary}, WorkbenchJob.t()) :: activity_resp
  def update_job_status(%{status: %{} = status, prompt: prompt, output: output} = args, %WorkbenchJob{} = job)
    when is_binary(prompt) and is_binary(output) do
    %{result: result} = Repo.preload(job, :result)
    start_transaction()
    |> add_operation(:result, fn _ ->
      WorkbenchJobResult.changeset(result, status)
      |> Repo.update()
    end)
    |> add_operation(:activity, fn _ ->
      status =
        TextDiff.format(result.working_theory || "", status[:working_theory] || "", color: true)
        |> IO.iodata_to_binary()
        |> then(&Map.put(status, :diff, &1))
      create_job_activity(%{
        status: :successful,
        type: :memo,
        prompt: prompt,
        result: %{output: output, job_update: status},
        tool_call: args[:tool_call]
      }, job)
    end)
    |> execute()
    |> case do
      {:ok, %{activity: activity, result: result}} ->
        notify({:ok, %{job | result: result}}, :update)
        notify({:ok, activity}, :update)
      err -> err
    end
  end
  def update_job_status(_, _), do: {:error, "invalid input struct for job status update"}

  @spec complete_job(map, WorkbenchJob.t()) :: job_resp
  def complete_job(attrs, %WorkbenchJob{} = job) do
    start_transaction()
    |> add_operation(:activity, fn _ ->
      create_job_activity(%{
        status: :successful,
        type: :conclusion,
        prompt: "completing job...",
        result: %{output: attrs[:conclusion] || "no conclusion provided"}
      }, job)
    end)
    |> add_operation(:job, fn _ ->
      Repo.preload(job, :result)
      |> WorkbenchJob.changeset(%{
        status: :successful,
        completed_at: DateTime.utc_now(),
        result: Console.mapify(attrs)
      })
      |> Console.Repo.update()
    end)
    |> execute(extract: :job)
    |> notify(:update)
  end

  @doc """
  Saves usage records for a workbench job.
  """
  @spec save_usage(WorkbenchJob.t(), map) :: job_resp
  def save_usage(%WorkbenchJob{} = job, usage) do
    usage = AIUsage.sanitize(usage)

    start_transaction()
    |> add_operation(:job, fn _ ->
      job
      |> WorkbenchJob.changeset(%{usage: usage})
      |> Repo.update()
    end)
    |> add_operation(:budget, fn _ ->
      update_budget(job.workbench_id, usage)
    end)
    |> execute(extract: :job)
    |> notify(:update)
  end

  @doc """
  Atomically consumes a quantity from a workbench's budget.
  """
  @spec update_budget(Workbench.t() | binary, map) :: workbench_resp
  def update_budget(%Workbench{id: id}, usage), do: update_budget(id, usage)
  def update_budget(id, %{} = usage) when is_binary(id) do
    start_transaction()
    |> add_operation(:fetch, fn _ -> {:ok, get_workbench_with_lock!(id)} end)
    |> add_operation(:workbench, fn
      %{fetch: %Workbench{budget: %Budget{enabled: true} = budget} = workbench} ->
        new_budget = Budget.consume(budget, budget_quantity(budget, usage))
        workbench
        |> Workbench.changeset(%{budget: Console.mapify(new_budget)})
        |> Repo.update()
      %{fetch: %Workbench{} = bench} -> {:ok, bench}
    end)
    |> execute(extract: :workbench)
  end

  defp budget_quantity(%Budget{unit: :dollar}, usage), do: Map.get(usage, :total_cost)
  defp budget_quantity(%Budget{unit: :token}, usage), do: Map.get(usage, :total_tokens)

  @doc """
  Fails a job with an error message.
  """
  @spec fail_job(binary, WorkbenchJob.t()) :: job_resp
  def fail_job(error, %WorkbenchJob{} = job, usage \\ %{}) when is_binary(error) do
    usage = AIUsage.sanitize(usage)

    start_transaction()
    |> add_operation(:job, fn _ ->
      WorkbenchJob.changeset(job, %{
        status: :failed,
        completed_at: DateTime.utc_now(),
        error: error,
        usage: usage
      })
      |> Repo.update()
    end)
    |> add_operation(:budget, fn _ -> update_budget(job.workbench_id, usage) end)
    |> execute(extract: :job)
    |> notify(:update)
  end

  @doc """
  Updates the knowledge_updated_at timestamp for a job.
  """
  @spec knowledge_updated(WorkbenchJob.t()) :: job_resp
  def knowledge_updated(%WorkbenchJob{} = job) do
    job
    |> WorkbenchJob.changeset(%{knowledge_updated_at: DateTime.utc_now()})
    |> Repo.update()
    |> notify(:update)
  end

  defp notify({:ok, %Workbench{} = workbench}, :create, user),
    do: handle_notify(PubSub.WorkbenchCreated, workbench, actor: user)
  defp notify({:ok, %Workbench{} = workbench}, :update, user),
    do: handle_notify(PubSub.WorkbenchUpdated, workbench, actor: user)
  defp notify({:ok, %Workbench{} = workbench}, :delete, user),
    do: handle_notify(PubSub.WorkbenchDeleted, workbench, actor: user)
  defp notify({:ok, %WorkbenchJob{} = job}, :create, user),
    do: handle_notify(PubSub.WorkbenchJobCreated, job, actor: user)
  defp notify({:ok, %WorkbenchJob{} = job}, :update, user),
    do: handle_notify(PubSub.WorkbenchJobUpdated, job, actor: user)
  defp notify({:ok, %WorkbenchTool{} = tool}, :create, user),
    do: handle_notify(PubSub.WorkbenchToolCreated, tool, actor: user)
  defp notify({:ok, %WorkbenchTool{} = tool}, :update, user),
    do: handle_notify(PubSub.WorkbenchToolUpdated, tool, actor: user)
  defp notify({:ok, %WorkbenchTool{} = tool}, :delete, user),
    do: handle_notify(PubSub.WorkbenchToolDeleted, tool, actor: user)
  defp notify({:ok, %WorkbenchCron{} = cron}, :create, user),
    do: handle_notify(PubSub.WorkbenchCronCreated, cron, actor: user)
  defp notify({:ok, %WorkbenchCron{} = cron}, :update, user),
    do: handle_notify(PubSub.WorkbenchCronUpdated, cron, actor: user)
  defp notify({:ok, %WorkbenchCron{} = cron}, :delete, user),
    do: handle_notify(PubSub.WorkbenchCronDeleted, cron, actor: user)
  defp notify({:ok, %WorkbenchPrompt{} = prompt}, :create, user),
    do: handle_notify(PubSub.WorkbenchPromptCreated, prompt, actor: user)
  defp notify({:ok, %WorkbenchPrompt{} = prompt}, :update, user),
    do: handle_notify(PubSub.WorkbenchPromptUpdated, prompt, actor: user)
  defp notify({:ok, %WorkbenchPrompt{} = prompt}, :delete, user),
    do: handle_notify(PubSub.WorkbenchPromptDeleted, prompt, actor: user)
  defp notify({:ok, %QueuedPrompt{} = prompt}, :create, user),
    do: handle_notify(PubSub.WorkbenchQueuedPromptCreated, prompt, actor: user)
  defp notify({:ok, %WorkbenchSkill{} = skill}, :create, user),
    do: handle_notify(PubSub.WorkbenchSkillCreated, skill, actor: user)
  defp notify({:ok, %WorkbenchSkill{} = skill}, :update, user),
    do: handle_notify(PubSub.WorkbenchSkillUpdated, skill, actor: user)
  defp notify({:ok, %WorkbenchSkill{} = skill}, :delete, user),
    do: handle_notify(PubSub.WorkbenchSkillDeleted, skill, actor: user)
  defp notify({:ok, %WorkbenchEval{} = eval}, :create, user),
    do: handle_notify(PubSub.WorkbenchEvalCreated, eval, actor: user)
  defp notify({:ok, %WorkbenchEval{} = eval}, :update, user),
    do: handle_notify(PubSub.WorkbenchEvalUpdated, eval, actor: user)
  defp notify({:ok, %WorkbenchEval{} = eval}, :delete, user),
    do: handle_notify(PubSub.WorkbenchEvalDeleted, eval, actor: user)
  defp notify({:ok, %WorkbenchWebhook{} = webhook}, :create, user),
    do: handle_notify(PubSub.WorkbenchWebhookCreated, webhook, actor: user)
  defp notify({:ok, %WorkbenchWebhook{} = webhook}, :update, user),
    do: handle_notify(PubSub.WorkbenchWebhookUpdated, webhook, actor: user)
  defp notify({:ok, %WorkbenchWebhook{} = webhook}, :delete, user),
    do: handle_notify(PubSub.WorkbenchWebhookDeleted, webhook, actor: user)
  defp notify({:ok, %WorkbenchChatbot{} = chatbot}, :create, user),
    do: handle_notify(PubSub.WorkbenchChatbotCreated, chatbot, actor: user)
  defp notify({:ok, %WorkbenchChatbot{} = chatbot}, :update, user),
    do: handle_notify(PubSub.WorkbenchChatbotUpdated, chatbot, actor: user)
  defp notify({:ok, %WorkbenchChatbot{} = chatbot}, :delete, user),
    do: handle_notify(PubSub.WorkbenchChatbotDeleted, chatbot, actor: user)
  defp notify({:ok, %WorkbenchPolicy{} = policy}, :create, user),
    do: handle_notify(PubSub.WorkbenchPolicyCreated, policy, actor: user)
  defp notify({:ok, %WorkbenchPolicy{} = policy}, :update, user),
    do: handle_notify(PubSub.WorkbenchPolicyUpdated, policy, actor: user)
  defp notify({:ok, %WorkbenchPolicy{} = policy}, :delete, user),
    do: handle_notify(PubSub.WorkbenchPolicyDeleted, policy, actor: user)
  defp notify({:ok, %WorkbenchJobActivity{} = activity}, :create, user),
    do: handle_notify(PubSub.WorkbenchJobActivityCreated, activity, actor: user)
  defp notify(pass, _, _), do: pass

  def notify({:ok, %WorkbenchJobThought{} = thought}, :create),
    do: handle_notify(PubSub.WorkbenchJobThoughtCreated, thought)
  def notify({:ok, %WorkbenchJobActivity{} = activity}, :create),
    do: handle_notify(PubSub.WorkbenchJobActivityCreated, activity)
  def notify({:ok, %WorkbenchJob{} = job}, :update),
    do: handle_notify(PubSub.WorkbenchJobUpdated, job)
  def notify({:ok, %WorkbenchJobActivity{} = activity}, :update),
    do: handle_notify(PubSub.WorkbenchJobActivityUpdated, activity)
  def notify(pass, _), do: pass
end
