defmodule Console.AI.Plan do
  @moduledoc """
  Generates an IaC plan summary and posts it as a PR review comment.

  This is intentionally not an AI insight: the only consumer is the GitHub/GitLab
  comment, so there is no memoized insight record to persist.
  """
  import Console.AI.Fixer.Base
  alias Console.Repo
  alias Console.AI.{Provider, Cron, Chat.Engine, Tools.PlanSummary}
  alias Console.Deployments.Stacks
  alias Console.Schema.{StackRun, StackState, PullRequest, GitRepository}

  @spec enqueue(StackRun.t) :: {:ok, pid} | :ok
  def enqueue(%StackRun{id: id} = run) do
    Cron.if_enabled(fn ->
      case Repo.preload(run, [:pull_request, :state]) do
        %StackRun{pull_request: %PullRequest{}, state: %StackState{plan: p}} = run when is_binary(p) ->
          me = node()
          case Console.ClusterRing.node(id) do
            ^me -> Console.AI.TaskSupervisor
            node -> {Console.AI.TaskSupervisor, node}
          end
          |> Task.Supervisor.start_child(fn -> comment(run) end)
        _ -> :ok
      end
    end)
  end
  def enqueue(_), do: :ok

  @spec comment(StackRun.t) :: {:ok, StackRun.t} | :ok | Console.error
  def comment(%StackRun{} = run) do
    run = Repo.preload(run, [:pull_request, :repository, :stack, :state])
    with {:ok, markdown} <- summarize(run),
      do: Stacks.post_plan_comment(run, markdown)
  end

  defp summarize(%StackRun{state: %StackState{} = state} = run) do
    history =
      [prompt(run, state) | fetch_code(run)]
      |> Engine.fit_context_window(PlanSummary.preface())

    Provider.simple_tool_call(history, PlanSummary, client: :default, preface: PlanSummary.preface())
  end

  defp prompt(%StackRun{stack: stack, repository: %GitRepository{} = repo, git: git, type: type}, %StackState{plan: plan}) do
    {:user, """
    The Plural stack #{stack.name} has a terraform plan generated and the user will want to understand what it means, in particular:

    * expected blast radius of the change
    * if any critical systems can be affected by the change
    * whether it's safe to apply

    The plan itself is recorded below:

    ```
    #{plan}
    ```

    It is sourcing #{type} configuration from the git repository at #{repo.url} from the folder #{git.folder} at ref #{git.ref}.
    """}
  end

  defp fetch_code(%StackRun{} = run) do
    with {:ok, f} <- Stacks.tarstream(run),
         {:ok, msgs} <- code_prompt(f, run.git.folder, "I'll also include the relevant #{run.type} code below, listed in the format #{file_fmt()}") do
      msgs
    else
      _ -> []
    end
  end
end
