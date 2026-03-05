defmodule Console.AI.File.Grepper do
  @moduledoc """
  Pretty basic in-memory elixir grep implementation.  At some point we should rewrite this as a Rust NIF.
  """
  defstruct [line: 0, prior: [], post: [], rest: [], results: []]

  defmodule Result do
    @derive Jason.Encoder
    defstruct [:content, :start_line, :end_line]
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
      |> then(& {:ok, &1.results})
    end
  end

  defp traverse(%__MODULE__{line: line, prior: prior, post: [l | _] = post, results: results} = state, regex) do
    case Regex.match?(regex, l) do
      true -> %{state | results: [new_result(l, line, prior, post) | results]}
      _ -> state
    end
    |> bookkeep()
    |> traverse(regex)
  end
  defp traverse(state, _regex), do: state

  defp bookkeep(%__MODULE__{line: line, prior: prior, post: [ph | post], rest: [h | rest]} = state) do
    %{state | line: line + 1, prior: ensure_length(prior ++ [ph]), post: post ++ [h], rest: rest}
  end
  defp bookkeep(%__MODULE__{line: line, prior: prior, post: [ph | post]} = state) do
    %{state | line: line + 1, prior: ensure_length(prior ++ [ph]), post: post}
  end
  defp bookkeep(%__MODULE__{line: line} = state), do: %{state | line: line + 1}

  defp ensure_length(list) when length(list) <= @context, do: list
  defp ensure_length([_ | rest]), do: rest

  defp new_result(line, num, prior, post) do
    {left, right} = juggle_lists(prior, post, length(prior), length(post))
    %Result{
      content: Enum.join(left ++ [line] ++ right, "\n"),
      start_line: num - length(left),
      end_line: num + length(right) + 1
    }
  end

  defp juggle_lists(prior, post, lprior, lpost) when lprior >= 10 and lpost >= 10,
    do: {Enum.take(prior, 10), reverse_take(post, 10)}
  defp juggle_lists(prior, post, lprior, lpost) when lpost >= 10,
    do: {prior, reverse_take(post, 20 - lprior)}
  defp juggle_lists(prior, post, lprior, lpost) when lprior >= 10,
    do: {Enum.take(prior, 20 - lpost), post}
  defp juggle_lists(prior, post, _lprior, _lpost), do: {prior, post}

  defp reverse_take(list, count) do
    Enum.reverse(list)
    |> Enum.take(count)
    |> Enum.reverse()
  end
end
