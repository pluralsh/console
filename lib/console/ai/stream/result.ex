defmodule Console.AI.Stream.Result do
  defmodule Tool do
    @type t :: %__MODULE__{}

    defstruct [:index, :name, arguments: ""]

    def new(index, attrs) do
      %__MODULE__{
        index: index,
        name: attrs["name"],
        arguments: attrs["arguments"]
      }
    end

    def args(%__MODULE__{arguments: args} = t, next),
      do: put_in(t.arguments, args <> next)

    def format(%__MODULE__{name: n, arguments: args}) do
      with {:ok, args} <- Jason.decode(args),
        do: {:ok, %Console.AI.Tool{name: n, arguments: args}}
    end
  end

  @type t :: %__MODULE__{text: [binary], tools: %{binary => Tool.t}}

  defstruct [ind: 0, text: [], tools: %{}]

  def new(), do: %__MODULE__{}

  def text(%__MODULE__{text: l} = res, txt),
    do: put_in(res.text, [txt | l])

  def tool(%__MODULE__{tools: tools} = res, index, tool) do
    case Map.get(tools, index) do
      nil -> put_in(res.tools[index], Tool.new(index, tool))
      %Tool{} = t -> put_in(res.tools[index], Tool.args(t, tool["arguments"]))
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
