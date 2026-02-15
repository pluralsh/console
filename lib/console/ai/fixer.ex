defmodule Console.AI.Fixer do
  @moduledoc """
  Owns logic for generating service/stack/etc insight fix recommendations
  """
  use Console.Services.Base
  import Console.AI.Evidence.Base, only: [prepend: 2, append: 2]
  import Console.AI.Policy
  alias Console.Schema.{AiInsight, Alert, Service, ServiceComponent, Stack, StackRun, Cluster, User, PullRequest}
  alias Console.AI.Fixer.Service, as: ServiceFixer
  alias Console.AI.Fixer.Stack, as: StackFixer
  alias Console.AI.Fixer.Alert, as: AlertFixer
  alias Console.AI.{Provider, Tools.Pr}

  @type pr_resp :: {:ok, PullRequest.t} | Console.error
  @type resp :: {:ok, binary} | Console.error

  @prompt """
  Please provide the most straightforward code or configuration change available based on the information I've already provided above to fix this issue.

  Be sure to explicitly state the Git repository and full file names that are needed to change, alongside the content of the files that need to be modified with enough surrounding context to understand what changed.  Also provide a git-style diff comparison for each changed file where possible.
  """

  @tool """
  Please spawn a Pull Request to fix the issue described above.  The code change should be the most direct
  and straightforward way to fix the issue described.  Change only the minimal amount of lines in the original files
  provided to successfully fix the issue, avoid any extraneous changes as they will potentially break additional
  functionality upon application.

  You must always provide the following information, which will be given to you and are necessary to create the PR:
  - The git repository url
  - The branch name
  - The commit message
  - The PR title
  - The PR body
  - The PR description

  The necessary file updates will be easy to infer from the summary given
  """

  @callback prompt(struct, binary) :: {:ok, Provider.history} | Console.error

  @doc """
  Spawns a pr given a fix recommendation
  """
  @spec refresh(binary, User.t) :: {:ok, AiInsight.t} | Console.error
  def refresh(id, %User{} = user) do
    start_transaction()
    |> add_operation(:insight, fn _ ->
      Repo.get!(AiInsight, id)
      |> Repo.preload([:service, :stack, :alert, :cluster])
      |> AiInsight.changeset(%{force: true})
      |> allow(user, :read)
      |> when_ok(:update)
    end)
    |> add_operation(:refresh, fn
      %{insight: %AiInsight{service: %Service{} = svc}} ->
        do_refresh(svc)
      %{insight: %AiInsight{stack: %Stack{} = stack}} ->
        do_refresh(stack)
      %{insight: %AiInsight{alert: %Alert{} = alert}} ->
        do_refresh(alert)
      %{insight: %AiInsight{cluster: %Cluster{} = cluster}} ->
        do_refresh(cluster)
      _ ->
        {:error, "can only refresh service, stack, cluster, or alert insights, sub-insights are propagated downstream"}
    end)
    |> add_operation(:children, fn %{refresh: parent} -> refresh_children(parent) end)
    |> execute(extract: :insight)
  end

  defp do_refresh(%{__struct__: schema} = model) do
    schema.changeset(model, %{ai_poll_at: Timex.now(), force_insight: true})
    |> Repo.update()
  end

  defp refresh_children(%Service{id: id}) do
    AiInsight.all_components(id)
    |> Repo.update_all(set: [force: true])
    |> ok()
  end

  defp refresh_children(%Stack{id: id}) do
    AiInsight.all_stack_runs(id)
    |> Repo.update_all(set: [force: true])
    |> ok()
  end

  defp refresh_children(_), do: {:ok, []}

  @doc """
  Generate a fix recommendation from an ai insight struct
  """
  @spec fix(AiInsight.t) :: {:ok, binary} | Console.error
  def fix(%AiInsight{
    service: svc,
    service_component: comp,
    stack: stack,
    alert: alert,
    stack_run: stack_run
  } = insight)
      when is_map(svc) or is_map(comp) or is_map(stack) or is_map(alert) or is_map(stack_run) do
    with {:ok, prompt} <- fix_prompt(insight),
      do: Provider.completion(ask(prompt), client: :tool)
  end

  def fix(_), do: {:error, "ai fix recommendations not supported for this insight"}

  @doc """
  Generate a fix recommendation from an ai insight struct
  """
  @spec pr(binary | AiInsight.t, Provider.history, User.t) :: pr_resp
  def pr(%AiInsight{
    service: svc,
    service_component: comp,
    stack: stack,
    alert: alert,
    stack_run: stack_run
  } = insight, history, %User{} = user)
      when is_map(svc) or is_map(comp) or is_map(stack) or is_map(alert) or is_map(stack_run) do
    with {:ok, prompt} <- pr_prompt(insight, history) do
      ask(prompt, @tool)
      |> Provider.simple_tool_call(Pr)
      |> handle_tool_call(pluck(insight), user)
    end
  end

  def pr(id, history, %User{} = user) when is_binary(id) do
    Console.AI.Tool.context(%{user: user})
    Repo.get!(AiInsight, id)
    |> Repo.preload([:service, :stack, :alert, stack_run: :stack, service_component: :service])
    |> allow(user, :read)
    |> when_ok(&pr(&1, history, user))
  end

  def pr(_, _, _), do: {:error, "ai fix recommendations not supported for this insight"}

  @doc """
  Determines if a user has access to this insight, and generates a fix recommendation if so
  """
  @spec fix(binary, User.t) :: {:ok, binary} | Console.error
  def fix(id, %User{} = user) do
    Repo.get!(AiInsight, id)
    |> Repo.preload([:service, :stack, :alert, stack_run: :stack, service_component: :service])
    |> allow(user, :read)
    |> when_ok(&fix/1)
  end

  defp ask(prompt, task \\ @prompt), do: prompt ++ [{:user, task}]

  defp pr_prompt(%AiInsight{text: insight} = i, history) do
    with {:ok, msgs} <- fix_prompt(i) do
      msgs
      |> prepend({:user, """
      We've found an issue with a problematic #{insight_scope(i)}:

      #{insight}

      We'll want to make a code change to fix the issue identified.  Here's the evidence used to generate the code change:
      """})
      |> maybe_add_fix(history)
      |> ok()
    end
  end

  def handle_tool_call({:ok, %{} = pr_attrs}, %{} = additional, %User{} = user) do
    %PullRequest{author_id: user.id}
    |> PullRequest.changeset(Map.merge(pr_attrs, additional))
    |> Repo.insert()
  end
  def handle_tool_call(err, _, _), do: err

  defp fix_prompt(%AiInsight{stack_run: %StackRun{} = stack_run, text: text}), do: StackFixer.prompt(stack_run, text)
  defp fix_prompt(%AiInsight{stack: %Stack{} = stack, text: text}), do: StackFixer.prompt(stack, text)
  defp fix_prompt(%AiInsight{service: %Service{} = service, text: text}), do: ServiceFixer.prompt(service, text)
  defp fix_prompt(%AiInsight{service_component: %ServiceComponent{} = comp, text: text}),
    do: ServiceFixer.prompt(comp, text)
  defp fix_prompt(%AiInsight{alert: %Alert{} = alert, text: text}), do: AlertFixer.prompt(alert, text)

  defp insight_scope(%AiInsight{service: %Service{}}), do: "Plural Service"
  defp insight_scope(%AiInsight{stack: %Stack{}}), do: "Plural Stack"
  defp insight_scope(%AiInsight{alert: %Alert{}}), do: "alert registered with Plural"
  defp insight_scope(%AiInsight{stack_run: %StackRun{}}), do: "Plural Stack"
  defp insight_scope(%AiInsight{service_component: %ServiceComponent{}}), do: "Plural Service"

  defp pluck(%AiInsight{service: %Service{id: id}}), do: %{service_id: id}
  defp pluck(%AiInsight{service_component: %ServiceComponent{service_id: id}}), do: %{service_id: id}
  defp pluck(%AiInsight{stack: %Stack{id: id}}), do: %{stack_id: id}
  defp pluck(%AiInsight{stack_run: %StackRun{stack_id: id}}), do: %{stack_id: id}
  defp pluck(%AiInsight{alert: %Alert{service_id: id}}), do: %{service_id: id}
  defp pluck(_), do: %{}

  defp maybe_add_fix(prompt, [_ | _] = history) do
    prompt
    |> append({:user, "We've also found a code change needed to fix the above issue, described below.  Note that sometimes this will sometimes represent a PARTIAL change to the underlying file, don't delete unrelated content if that's not what's relevant to change:"})
    |> append(history)
  end
  defp maybe_add_fix(prompt, _), do: prompt
end
