defmodule Console.AI.Tools.EnableTools do
  use Ecto.Schema
  import Ecto.Changeset
  alias Console.AI.Chat.EnabledTools

  embedded_schema do
    field :enabled,     :map, virtual: true
    field :tools,       {:array, :string}
  end

  @json_schema Console.priv_file!("tools/enable_tools.json") |> Jason.decode!()

  def json_schema(_), do: @json_schema
  def name(_), do: "enable_tools"
  def description(_), do: "Enable a list of tools by name.  Can enable multiple in one shot."

  @valid ~w(tools)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> validate_required([:tools])
  end

  def implement(%__MODULE__{enabled: enabled, tools: tools}) do
    EnabledTools.enable(enabled, tools)
  end
end
