defmodule Console.AI.Stream.SSE do
  @double_eol ~r/(\r?\n|\r){2}/
  @eol ~r/(\r?\n|\r)/

  defmodule Event do
    @type t :: %__MODULE__{event: binary | nil, data: binary | map | nil}

    defstruct [:event, :data]

    def build(parts) when is_list(parts) do
      Map.new(parts, fn [k, v] -> {k, v} end)
      |> build()
    end

    def build(%{} = parts) do
      %__MODULE__{
        event: safe_trim(parts["event"]),
        data: safe_json(safe_trim(parts["data"]))
      }
    end

    defp safe_trim(str) when is_binary(str), do: String.trim(str)
    defp safe_trim(_), do: nil

    defp safe_json("[DONE]"), do: "[DONE]" # openai is stupid sometimes
    defp safe_json(str) when is_binary(str) do
      case Jason.decode(str) do
        {:ok, res} -> res
        _ -> str
      end
    end
  end

  @spec parse(binary) :: {[Event.t], binary}
  def parse(chunk) do
    chunks = String.split(chunk, @double_eol)
    {straggle, full} = List.pop_at(chunks, -1)
    {Enum.map(full, &parse_chunk/1), straggle}
  end

  defp parse_chunk(chunk) do
    String.split(chunk, @eol)
    |> Enum.map(&String.split(&1, ":", parts: 2))
    |> Event.build()
  end
end
