defmodule Console.AI.Utils do
  @moduledoc """
  Some utils functions for interacting w/ ai apis
  """

  @split "===plrl-split==="

  def embedding_dims(), do: 512

  def stopword(), do: @split

  def maybe_ok({:error, err}), do: {:error, err}
  def maybe_ok(res), do: {:ok, res}

  @spec chunk(binary, integer) :: [binary]
  def chunk(str, size) do
    String.split(str, @split)
    |> Enum.map(&String.trim/1)
    |> Enum.flat_map(&do_chunk(&1, size, []))
  end

  defp do_chunk("", _, acc), do: Enum.reverse(acc)
  defp do_chunk(str, size, acc) do
    {chunk, rest} = String.split_at(str, size)
    do_chunk(rest, size, [chunk | acc])
  end
end
