defmodule Console.AI.Fixer do
  @moduledoc """
  Owns logic for generating service/stack/etc insight fix recommendations
  """
  alias Console.Schema.{AiInsight, Service, Stack}
  alias Console.AI.Fixer.Service, as: ServiceFixer
  alias Console.AI.Fixer.Stack, as: StackFixer
  alias Console.AI.Provider

  @callback prompt(struct, binary) :: {:ok, Provider.history} | Console.error

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

  defp ask(prompt), do: prompt ++ [{:user, "please provide the most cogent code or configuration change available based on the information I've already provided above to fix this issue"}]
end
