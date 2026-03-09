defmodule Console.AI.Stream.Result do
  @moduledoc """
  Accumulates streaming results from AI providers (OpenAI Chat Completions,
  OpenAI Responses API, and Anthropic Messages API).
  """

  defmodule Tool do
    @moduledoc """
    Represents a tool call being accumulated from streaming chunks.
    Supports both OpenAI Chat Completions format and Responses API format.
    """
    @type t :: %__MODULE__{}

    defstruct [:index, :id, :name, arguments: ""]

    @doc """
    Creates a new Tool from streaming attributes.
    Handles both Chat Completions (call_id) and Responses API (id) formats.
    """
    def new(index, attrs) do
      %__MODULE__{
        index: index,
        id: attrs["call_id"] || attrs["id"],
        name: attrs["name"],
        arguments: attrs["arguments"] || ""
      }
    end

    @doc """
    Updates an existing tool with additional data.
    Used when receiving partial updates (e.g., name or id arriving after initial creation).
    """
    def update(%__MODULE__{} = t, attrs) do
      %__MODULE__{t |
        id: t.id || attrs["call_id"] || attrs["id"],
        name: t.name || attrs["name"],
        arguments: append_args(t.arguments, attrs["arguments"])
      }
    end

    @doc """
    Appends argument data to the tool's accumulated arguments.
    """
    def args(%__MODULE__{arguments: args} = t, next) when is_binary(next),
      do: put_in(t.arguments, args <> next)
    def args(%__MODULE__{} = t, _), do: t

    defp append_args(existing, nil), do: existing
    defp append_args(existing, new) when is_binary(new), do: existing <> new
    defp append_args(existing, _), do: existing

    def format(%__MODULE__{id: id, name: n, arguments: args}) when is_binary(args) and byte_size(args) > 0  do
      with {:ok, args} <- Jason.decode(args),
        do: {:ok, %Console.AI.Tool{id: id, name: n, arguments: args}}
    end
    def format(%__MODULE__{id: id, name: n}), do: {:ok, %Console.AI.Tool{id: id, name: n, arguments: %{}}}
  end

  @type t :: %__MODULE__{text: [binary], tools: %{binary => Tool.t}}

  defstruct [ind: 0, text: [], tools: %{}]

  def new(), do: %__MODULE__{}

  def text(%__MODULE__{text: l} = res, txt),
    do: put_in(res.text, [txt | l])

  @doc """
  Updates the result with tool data from a streaming chunk.
  Handles both initial tool creation and subsequent argument deltas.
  """
  def tool(%__MODULE__{tools: tools} = res, index, tool_data) do
    case Map.get(tools, index) do
      nil ->
        put_in(res.tools[index], Tool.new(index, tool_data))
      %Tool{} = existing ->
        put_in(res.tools[index], Tool.update(existing, tool_data))
    end
  end

  def finalize(%__MODULE__{tools: t, text: l}) when map_size(t) <= 0,
    do: {:ok, Enum.reverse(l) |> IO.iodata_to_binary()}

  def finalize(%__MODULE__{tools: tools, text: l}) do
    Enum.reduce_while(tools, [], fn {_, t}, result ->
      case Tool.format(t) do
        {:ok, t} -> {:cont, [t | result]}
        err -> {:halt, err}
      end
    end)
    |> case do
      {:error, _} = err -> err
      tools when is_list(tools) ->
        text = Enum.reverse(l)
               |> IO.iodata_to_binary()
        {:ok, text, tools}
    end
  end
end
