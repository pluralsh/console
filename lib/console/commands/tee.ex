defmodule Console.Commands.Tee do
  defstruct [stdo: []]

  def new(), do: %__MODULE__{stdo: []}

  defimpl Collectable, for: __MODULE__ do
    def into(tee) do
      {tee, fn
        %{stdo: stdo} = tee, {:cont, line} when is_binary(line) ->
          IO.write(line)
          %{tee | stdo: [line | stdo]}
        tee, :done -> tee
        _, :halt -> :ok
      end}
    end
  end

  def output(%__MODULE__{stdo: lines}) do
    Enum.reverse(lines)
    |> Enum.join("")
  end
end
