defmodule Console.AI.Tools.ToolSearch do
  use Ecto.Schema
  import Ecto.Changeset
  alias Console.AI.Chat.EnabledTools

  embedded_schema do
    field :enabled,     :map, virtual: true
    field :query,       :string
    field :max_results, :integer, default: 10
  end

  @json_schema Console.priv_file!("tools/tool_search.json") |> Jason.decode!()

  def json_schema(_), do: @json_schema
  def name(_), do: "tool_search"
  def description(%{enabled: %EnabledTools{tool_names: names}}), do: "Search for a tool by name and return their schemas.  Available tool names currently are #{Enum.join(names, ", ")}"

  @valid ~w(query max_results)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> validate_required([:query])
  end

  def implement(%__MODULE__{enabled: tools, query: query, max_results: max_results}) do
    with {:ok, found} <- EnabledTools.search(tools, query, max_results),
      do: Jason.encode(found)
  end
end
