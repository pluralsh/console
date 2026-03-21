defmodule Console.AI.Agents.Subagents.Terraform do
  alias Console.AI.Chat.MemoryEngine
  alias Console.AI.Tools.Agent.{
    Stack,
    Coding.StackFiles,
    GenericPr,
    Complete
  }
  require EEx

  @tools [
    Stack,
    StackFiles,
    GenericPr,
    Complete
  ]

  @prompt "Find the stack that needs to be modified and make the changes requested"

  @spec exec(binary) :: {:ok, Complete.t} | {:error, binary}
  def exec(prompt) do
    @tools
    |> MemoryEngine.new(30, system_prompt: prompt(prompt: prompt))
    |> MemoryEngine.reduce([{:user, @prompt}], &reducer/2)
    |> case do
      {:ok, %Complete{} = complete} -> {:ok, complete}
      {:ok, msg} when is_binary(msg) -> {:error, msg}
      {:error, error} -> {:error, "error running code agent: #{inspect(error)}"}
    end
  end

  defp reducer(messages, _) do
    case Enum.find(messages, &match?(%Complete{}, &1)) do
      %Complete{} = complete -> {:halt, complete}
      _ -> MemoryEngine.last_message(messages)
    end
  end

  EEx.function_from_file(:defp, :prompt, Console.priv_filename(["prompts", "subagents", "terraform.md.eex"]), [:assigns])
end
