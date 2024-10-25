defmodule Console.AI.Fixer.Stack do
  @behaviour Console.AI.Fixer
  use Console.AI.Evidence.Base
  import Console.AI.Fixer.Base
  alias Console.Repo
  alias Console.Schema.{Stack, Service, GitRepository}
  alias Console.Deployments.{Stacks}

  def prompt(%Stack{} = stack, insight) do
    stack = Repo.preload(stack, [:repository])
    with {:ok, f} <- Stacks.tarstream(stack),
         {:ok, code} <- code_prompt(f) do
      ok([
        {:user, """
          We've found the following insight about a Plural Stack that is currently in #{stack.status} state:

          #{insight}

          We'd like you to suggest a simple code or configuration change that can fix the issues identified in that insight.
          I'll do my best to list all the needed resources below.
        """},
        {:user, stack_details(stack)} | code
      ])
    end
  end

  defp stack_details(%Stack{git: %Service.Git{ref: ref, folder: f}, repository: %GitRepository{url: url}} = stack) do
    """
    The stack is is configured to execute the #{stack.type} infrastructure as code tool and is currently failing to complete.

    In addition, it's sources code from a Git repository hosted at url #{url}, present at the git reference #{ref} and folder #{f}
    """
  end
end
