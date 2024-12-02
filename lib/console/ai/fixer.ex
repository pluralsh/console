defmodule Console.AI.Fixer do
  @moduledoc """
  Owns logic for generating service/stack/etc insight fix recommendations
  """
  use Console.Services.Base
  import Console.AI.Policy
  alias Console.Schema.{AiInsight, Service, Stack, User, PullRequest}
  alias Console.AI.Fixer.Service, as: ServiceFixer
  alias Console.AI.Fixer.Stack, as: StackFixer
  alias Console.AI.{Provider, Tools.Pr}

  @prompt """
  Please provide the most straightforward code or configuration change available based on the information I've already provided above to fix this issue.

  Be sure to explicitly state the Git repository and full file names that are needed to change, alongside the complete content of the files that need to be modified.
  """

  @tool """
  Please provide the appropriate create_pr function call to spawn a Pull Request to fix the issue described above.  The code change should be the most direct
  and straightforward way to fix the issue described, avoid any extraneous changes or modifying files not listed.
  """

  @callback prompt(struct, binary) :: {:ok, Provider.history} | Console.error

  @doc """
  Generate a fix recommendation from an ai insight struct
  """
  @spec fix(AiInsight.t) :: {:ok, binary} | Console.error
  def fix(%AiInsight{service: %Service{} = svc, text: text}) do
    with {:ok, prompt} <- ServiceFixer.prompt(svc, text),
      do: Provider.completion(ask(prompt))
  end

  def fix(%AiInsight{stack: %Stack{} = stack, text: text}) do
    with {:ok, prompt} <- StackFixer.prompt(stack, text),
      do: Provider.completion(ask(prompt))
  end

  def fix(_), do: {:error, "ai fix recommendations not supported for this insight"}

  @doc """
  Generate a fix recommendation from an ai insight struct
  """
  @spec pr(AiInsight.t) :: {:ok, PullRequest.t} | Console.error
  def pr(%AiInsight{service: %Service{} = svc, text: text}) do
    with {:ok, prompt} <- ServiceFixer.prompt(svc, text) do
      Provider.tool_call(ask(prompt, @tool), [Pr])
      |> handle_tool_call(%{service_id: svc.id})
    end
  end

  def pr(%AiInsight{stack: %Stack{} = stack, text: text}) do
    with {:ok, prompt} <- StackFixer.prompt(stack, text) do
      Provider.tool_call(ask(prompt, @tool), [Pr])
      |> handle_tool_call(%{stack_id: stack.id})
    end
  end

  def pr(_), do: {:error, "ai fix recommendations not supported for this insight"}

  @doc """
  Spawns a pr given a fix recommendation
  """
  @spec pr(binary, User.t) :: {:ok, PullRequest.t} | Console.error
  def pr(id, %User{} = user) do
    Console.AI.Tool.set_actor(user)

    Repo.get!(AiInsight, id)
    |> Repo.preload([:service, :stack])
    |> allow(user, :read)
    |> when_ok(&pr/1)
  end

  @doc """
  Determines if a user has access to this insight, and generates a fix recommendation if so
  """
  @spec fix(binary, User.t) :: {:ok, binary} | Console.error
  def fix(id, %User{} = user) do
    Repo.get!(AiInsight, id)
    |> Repo.preload([:service, :stack])
    |> allow(user, :read)
    |> when_ok(&fix/1)
  end

  defp handle_tool_call({:ok, [%{create_pr: %{result: pr_attrs}} | _]}, additional) do
    %PullRequest{}
    |> PullRequest.changeset(Map.merge(pr_attrs, additional))
    |> Repo.insert()
  end
  defp handle_tool_call({:ok, [%{create_pr: %{error: err}} | _]}, _), do: {:error, err}
  defp handle_tool_call({:ok, msg}, _), do: {:error, msg}
  defp handle_tool_call(err, _), do: err

  defp ask(prompt, task \\ @prompt), do: prompt ++ [{:user, task}]
end
