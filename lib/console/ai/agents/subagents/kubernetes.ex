defmodule Console.AI.Agents.Subagents.Kubernetes do
  import Console.AI.Agents.Subagents.Utils, only: [publish_thought: 2]
  alias Console.AI.Chat.MemoryEngine
  alias Console.AI.Tools.Agent.{
    ServiceComponent,
    Coding.ServiceFiles,
    Coding.GenericPr,
    ApiSpec,
    Discovery,
    Complete
  }
  require EEx

  @tools [
    ServiceComponent,
    ServiceFiles,
    GenericPr,
    ApiSpec,
    Discovery,
    Complete
  ]

  @prompt "Find the service that needs to be modified and make the changes requested"

  @spec exec(binary, Keyword.t) :: {:ok, Complete.t} | {:error, binary}
  def exec(prompt, opts \\ []) when is_binary(prompt) do
    @tools
    |> MemoryEngine.new(30, system_prompt: prompt(prompt: prompt), callback: &publish_thought(opts[:tool_id], &1))
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

  EEx.function_from_file(:defp, :prompt, Console.priv_filename(["prompts", "subagents", "kubernetes.md.eex"]), [:assigns], trim: true)
end
