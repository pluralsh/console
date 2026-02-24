defmodule Console.AI.Tools.ServiceNow do
  use Ecto.Schema
  import Ecto.Changeset

  embedded_schema do
    field :short_description,   :string
    field :description,         :string
    field :implementation_plan, :string
    field :backout_plan,        :string
    field :test_plan,           :string
  end

  @valid ~w(short_description description implementation_plan backout_plan test_plan)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> validate_required(@valid)
  end

  @json_schema Console.priv_file!("tools/snow.json") |> Jason.decode!()

  def json_schema(), do: @json_schema
  def name(), do: "service_now_change"
  def description() do
    """
    Creates a change in ServiceNow according to the given schema
    """
  end

  def implement(%__MODULE__{} = change), do: {:ok, change}
end
