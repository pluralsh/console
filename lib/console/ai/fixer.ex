defmodule Console.AI.Fixer do
  @moduledoc """
  Owns logic for generating service/stack/etc insight fix recommendations
  """
  use Console.Services.Base
  import Console.AI.Policy
  alias Console.Schema.{AiInsight, Service, Stack, User}
  alias Console.AI.Fixer.Service, as: ServiceFixer
  alias Console.AI.Fixer.Stack, as: StackFixer
  alias Console.AI.Provider

  @prompt """
  Please provide the most straightforward code or configuration change available based on the information I've already provided above to fix this issue.

  Be sure to explicitly state the Git repository and full file names that are needed to change, alongside the complete content of the files that need to be modified.
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
  Determines if a user has access to this insight, and generates a fix recommendation if so
  """
  @spec fix(binary, User.t) :: {:ok, binary} | Console.error
  def fix(id, %User{} = user) do
    Repo.get!(AiInsight, id)
    |> Repo.preload([:service, :stack])
    |> allow(user, :read)
    |> when_ok(&fix/1)
  end

  defp ask(prompt), do: prompt ++ [{:user, @prompt}]
end
