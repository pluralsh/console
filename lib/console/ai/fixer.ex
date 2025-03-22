defmodule Console.AI.Fixer do
  @moduledoc """
  Owns logic for generating service/stack/etc insight fix recommendations
  """
  use Console.Services.Base
  import Console.AI.Evidence.Base, only: [prepend: 2, append: 2]
  import Console.AI.Policy
  alias Console.Schema.{AiInsight, Alert, Service, Stack, User, PullRequest}
  alias Console.AI.Fixer.Service, as: ServiceFixer
  alias Console.AI.Fixer.Stack, as: StackFixer
  alias Console.AI.Fixer.Alert, as: AlertFixer
  alias Console.AI.{Provider, Tools.Pr}

  @type pr_resp :: {:ok, PullRequest.t} | Console.error

  @prompt """
  Please provide the most straightforward code or configuration change available based on the information I've already provided above to fix this issue.

  Be sure to explicitly state the Git repository and full file names that are needed to change, alongside the content of the files that need to be modified with enough surrounding context to understand what changed.  Also provide a git-style diff comparison for each changed file where possible.
  """

  @tool """
  Please spawn a Pull Request to fix the issue described above.  The code change should be the most direct
  and straightforward way to fix the issue described.  Change only the minimal amount of lines in the original files
  provided to successfully fix the issue, avoid any extraneous changes as they will potentially break additional
  functionality upon application.
  """

  @callback prompt(struct, binary) :: {:ok, Provider.history} | Console.error

  @doc """
  Generate a fix recommendation from an ai insight struct
  """
  @spec fix(AiInsight.t) :: {:ok, binary} | Console.error
  def fix(%AiInsight{service: svc, stack: stack, alert: alert} = insight)
      when is_map(svc) or is_map(stack) or is_map(alert) do
    with {:ok, prompt} <- fix_prompt(insight),
      do: Provider.completion(ask(prompt))
  end

  def fix(_), do: {:error, "ai fix recommendations not supported for this insight"}

  @doc """
  Generate a fix recommendation from an ai insight struct
  """
  @spec pr(AiInsight.t, Provider.history) :: pr_resp
  def pr(%AiInsight{service: svc, stack: stack, alert: alert} = insight, history)
      when is_map(svc) or is_map(stack) or is_map(alert) do
    with {:ok, prompt} <- pr_prompt(insight, history) do
      ask(prompt, @tool)
      |> Provider.tool_call([Pr])
      |> handle_tool_call(pluck(insight))
    end
  end

  def pr(_, _), do: {:error, "ai fix recommendations not supported for this insight"}

  @doc """
  Spawns a pr given a fix recommendation
  """
  @spec pr(binary, Provider.history, User.t) :: pr_resp
  def pr(id, history, %User{} = user) do
    Console.AI.Tool.context(%{user: user})
    Repo.get!(AiInsight, id)
    |> Repo.preload([:service, :stack, :alert])
    |> allow(user, :read)
    |> when_ok(&pr(&1, history))
  end

  @doc """
  Determines if a user has access to this insight, and generates a fix recommendation if so
  """
  @spec fix(binary, User.t) :: {:ok, binary} | Console.error
  def fix(id, %User{} = user) do
    Repo.get!(AiInsight, id)
    |> Repo.preload([:service, :stack, :alert])
    |> allow(user, :read)
    |> when_ok(&fix/1)
  end

  def handle_tool_call({:ok, [%{create_pr: %{result: pr_attrs}} | _]}, additional) do
    %PullRequest{}
    |> PullRequest.changeset(Map.merge(pr_attrs, additional))
    |> Repo.insert()
  end
  def handle_tool_call({:ok, [%{create_pr: %{error: err}} | _]}, _), do: {:error, err}
  def handle_tool_call({:ok, msg}, _), do: {:error, msg}
  def handle_tool_call(err, _), do: err

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

  defp fix_prompt(%AiInsight{stack: %Stack{} = stack, text: text}), do: StackFixer.prompt(stack, text)
  defp fix_prompt(%AiInsight{service: %Service{} = stack, text: text}), do: ServiceFixer.prompt(stack, text)
  defp fix_prompt(%AiInsight{alert: %Alert{} = stack, text: text}), do: AlertFixer.prompt(stack, text)

  defp insight_scope(%AiInsight{service: %Service{}}), do: "Plural Service"
  defp insight_scope(%AiInsight{stack: %Stack{}}), do: "Plural Stack"
  defp insight_scope(%AiInsight{alert: %Alert{}}), do: "alert registered with Plural"

  defp pluck(%AiInsight{service: %Service{id: id}}), do: %{service_id: id}
  defp pluck(%AiInsight{stack: %Stack{id: id}}), do: %{stack_id: id}
  defp pluck(%AiInsight{alert: %Alert{service_id: id}}), do: %{service_id: id}
  defp pluck(_), do: %{}

  defp maybe_add_fix(prompt, [_ | _] = history) do
    prompt
    |> append({:user, "We've also found a code change needed to fix the above issue, described below.  Note that sometimes this will sometimes represent a PARTIAL change to the underlying file, don't delete unrelated content if that's not what's relevant to change:"})
    |> append(history)
  end
  defp maybe_add_fix(prompt, _), do: prompt
end
