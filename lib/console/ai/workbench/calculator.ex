defmodule Console.AI.Workbench.Calculator do
  @moduledoc """
  Parses and evaluates arithmetic expressions using leex/yecc.
  """

  @type ast ::
          {:number, float()}
          | {:neg, ast()}
          | {:op, :+ | :- | :* | :/ | :^, ast(), ast()}

  @spec evaluate(binary()) :: {:ok, float()} | {:error, binary()}
  def evaluate(expression) when is_binary(expression) do
    with {:ok, ast} <- parse(expression),
         {:ok, value} <- interpret(ast) do
      {:ok, value}
    end
  end

  @spec parse(binary()) :: {:ok, ast()} | {:error, binary()}
  def parse(expression) when is_binary(expression) do
    with {:ok, tokens} <- tokenize(expression),
         {:ok, ast} <- parse_tokens(tokens) do
      {:ok, ast}
    end
  end

  @spec interpret(ast()) :: {:ok, float()} | {:error, binary()}
  def interpret(ast), do: eval(ast)

  defp tokenize(expression) do
    case :console_ai_workbenches_calculator_lexer.string(String.to_charlist(expression)) do
      {:ok, tokens, _line} ->
        {:ok, tokens ++ [{:"$end", 1}]}

      {:error, {line, _lexer, reason}, _line} ->
        {:error, "lex error at line #{line}: #{format_reason(reason)}"}
    end
  end

  defp parse_tokens(tokens) do
    case :console_ai_workbenches_calculator_parser.parse(tokens) do
      {:ok, ast} ->
        {:ok, to_ast(ast)}

      {:error, {line, _parser, reason}} ->
        {:error, "parse error at line #{line}: #{format_reason(reason)}"}
    end
  end

  defp to_ast({:number, value}), do: {:number, value}
  defp to_ast({:neg, value}), do: {:neg, to_ast(value)}
  defp to_ast({:op, op, left, right}), do: {:op, op, to_ast(left), to_ast(right)}

  defp eval({:number, value}), do: {:ok, value}

  defp eval({:neg, inner}) do
    with {:ok, value} <- eval(inner) do
      {:ok, -value}
    end
  end

  defp eval({:op, :+, left, right}), do: reduce_binary(left, right, &Kernel.+/2)
  defp eval({:op, :-, left, right}), do: reduce_binary(left, right, &Kernel.-/2)
  defp eval({:op, :*, left, right}), do: reduce_binary(left, right, &Kernel.*/2)
  defp eval({:op, :^, left, right}), do: reduce_binary(left, right, &:math.pow/2)

  defp eval({:op, :/, left, right}) do
    with {:ok, lhs} <- eval(left),
         {:ok, rhs} <- eval(right) do
      if rhs == 0.0 do
        {:error, "division by zero"}
      else
        {:ok, lhs / rhs}
      end
    end
  end

  defp reduce_binary(left, right, operation) do
    with {:ok, lhs} <- eval(left),
         {:ok, rhs} <- eval(right) do
      {:ok, operation.(lhs, rhs)}
    end
  end

  defp format_reason(reason) when is_list(reason), do: List.to_string(reason)
  defp format_reason(reason), do: inspect(reason)
end
