defmodule Console.AI.Fixer.Stack do
  @behaviour Console.AI.Fixer
  use Console.AI.Evidence.Base
  import Console.AI.Fixer.Base
  alias Console.Repo
  alias Console.AI.Fixer.Parent
  alias Console.Schema.{Stack, StackRun, Service, GitRepository, PullRequest}
  alias Console.Deployments.{Stacks}

  @spec healthy_prompt(Stack.t) :: {:ok, [{:user, binary}]} | Console.error()
  def healthy_prompt(%Stack{} = stack) do
    stack = Repo.preload(stack, [:repository])
    with {:ok, files} <- git_code_prompt(stack.git.folder, stack.git, stack.repository) do
      %{details: stack_details(stack), files: files}
      |> maybe_add_parent(stack)
      |> ok()
    end
  end

  @spec pr_prompt(Stack.t, PullRequest.t, binary) :: {:ok, [{:user, binary}]} | Console.error()
  def pr_prompt(%Stack{} = stack, %PullRequest{} = pr, branch) do
    stack = Repo.preload(stack, [:repository])
    with {:ok, files} <- git_code_prompt(stack.git.folder, %{stack.git | ref: branch}, stack.repository) do
      %{details: "#{stack_details(stack)}\n\n#{pr_details(pr, branch)}", files: files}
      |> maybe_add_parent(stack)
      |> ok()
    end
  end

  defp pr_details(%PullRequest{url: url}, branch) do
    """
    The stack is currently under review via a pull request at url #{url} and branch #{branch}.  The files
    provided will be for that branch of the git repository.
    """
  end

  defp maybe_add_parent(result, stack) do
    opts = [
      child: "#{stack.name} stack",
      cr: "InfrastructureStack",
      cr_additional: " specifying the name #{stack.name}"
    ]
    case Parent.parent_details(stack, opts) do
      {:ok, details} -> Map.put(result, :parent, details)
      _ -> result
    end
  end

  @spec prompt(Stack.t(), AiInsight.t()) :: {:ok, [{:user, binary}]} | Console.error()
  def prompt(%Stack{} = stack, insight) do
    stack = Repo.preload(stack, [:repository, :parent])
    with {:ok, f} <- Stacks.tarstream(last_run(stack)),
         {:ok, code} <- code_prompt(f, stack.git.folder) do
      Enum.concat([
        {:user, """
          We've found the following insight about a Plural Stack that is currently in #{stack.status} state:

          #{insight}

          We'd like you to suggest a simple code or configuration change that can fix the issues identified in that insight.
          I'll do my best to list all the needed resources below.
        """},
        {:user, stack_details(stack)} | code
      ], Parent.parent_prompt(
        stack,
        child: "#{stack.name} stack",
        cr: "InfrastructureStack",
        cr_additional: " specifying the name #{stack.name}"
      ))
      |> ok()
    end
  end

  defp stack_details(%Stack{git: %Service.Git{ref: ref, folder: f}, repository: %GitRepository{url: url}} = stack) do
    """
    The stack is is configured to execute the #{stack.type} infrastructure as code tool and is currently failing to complete.

    In addition, it's sources code from a Git repository hosted at url #{url}, present at the git reference #{ref} and folder #{f}
    """
  end

  defp last_run(%Stack{} = stack) do
    StackRun.for_stack(stack.id)
    |> StackRun.for_status(:failed)
    |> StackRun.ordered(desc: :id)
    |> StackRun.limit(1)
    |> Repo.one()
  end
end
