defmodule Console.AI.Agents.Pr do
  alias Console.AI.Chat.MemoryEngine
  alias Console.AI.Tools.{
    Pra.Ls,
    Pra.Read,
    Pra.Edit,
    Pra.Commit
  }
  require EEx

  @prompt "make all the edits requested for me"

  @spec exec(binary, binary) :: {:ok, Commit.t} | {:error, binary}
  def exec(dir, prompt) do
    tools(dir)
    |> MemoryEngine.new(30, system_prompt: prompt(prompt))
    |> MemoryEngine.reduce([{:user, @prompt}], &reducer/2)
    |> case do
      {:ok, %Commit{} = commit} -> {:ok, commit}
      {:ok, msg} when is_binary(msg) -> {:error, msg}
      {:error, error} -> {:error, "error running code agent: #{inspect(error)}"}
    end
  end

  defp reducer(messages, _) do
    case Enum.find(messages, &match?(%Commit{}, &1)) do
      %Commit{} = commit -> {:halt, commit}
      _ -> last_message(messages)
    end
  end

  defp last_message(messages) do
    Enum.reverse(messages)
    |> Enum.find(&match?({:assistant, content} when is_binary(content), &1))
    |> case do
      {:assistant, content} when is_binary(content) -> content
      _ -> "no reason given for failure"
    end
    |> then(& {:cont, &1})
  end

  defp tools(dir) do
    [
      %Ls{dir: dir},
      %Read{dir: dir},
      %Edit{dir: dir},
      Commit
    ]
  end

  EEx.function_from_file(:defp, :prompt, Console.priv_filename(["prompts", "pr", "agent.md.eex"]), [:assigns])
end
