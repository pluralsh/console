defmodule Console.AI.File.Grepper do
  @moduledoc """
  Pretty basic in-memory elixir grep implementation.  At some point we should rewrite this as a Rust NIF.
  """
  defstruct [line: 0, prior: [], post: [], rest: [], results: []]

  defmodule Result do
    @derive Jason.Encoder
    defstruct [:content, :line, highlighted: false]
  end

  @context 20

  def grep(content, pattern) when is_binary(content) do
    String.split(content, "\n")
    |> grep(pattern)
  end

  def grep(lines, pattern) when is_list(lines) do
    with {:ok, regex} <- Regex.compile(pattern) do
      %__MODULE__{
        post: Enum.take(lines, @context),
        rest: Enum.drop(lines, @context)
      }
      |> traverse(regex)
    end
  end

  defp traverse(%__MODULE__{line: line, prior: prior, post: post, rest: rest} = state, regex) do

    bookkeep(state)
    |> traverse(regex)
  end

  defp bookkeep(%__MODULE__{line: line, prior: prior, post: [ph | post], rest: [h | rest]} = state) do
    %{state | line: line + 1, prior: ensure_length(prior ++ [ph]), post: post ++ [h], rest: rest}
  end
  defp bookkeep(%__MODULE__{line: line, prior: prior, post: [ph | post]} = state) do
    %{state | line: line + 1, prior: ensure_length(prior ++ [ph]), post: post}
  end
  defp bookkeep(%__MODULE__{line: line} = state), do: %{state | line: line + 1}

  defp ensure_length(list) when length(list) <= @context, do: list
  defp ensure_length([_ | rest]), do: rest
end
