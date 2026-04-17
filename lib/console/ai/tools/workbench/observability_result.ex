defmodule Console.AI.Tools.Workbench.ObservabilityResult do
  use Console.AI.Tools.Workbench.Base
  alias Console.Schema.WorkbenchJobActivity
  alias Console.Schema.WorkbenchJobResult.ToolQuery

  embedded_schema do
    field :output, :string

    embeds_one :metrics_query, ToolQuery, on_replace: :update
    embeds_many :logs, Console.Schema.WorkbenchJobActivity.WorkbenchJobResult.Log, on_replace: :delete
  end

  @json_schema Console.priv_file!("tools/workbench/observability_result.json") |> Jason.decode!()

  def name(), do: "observability_result"
  def json_schema(), do: @json_schema
  def description(), do: "The result of the observability tool call"

  def changeset(model, attrs) do
    model
    |> cast(attrs, [:output])
    |> cast_embed(:logs, with: &WorkbenchJobActivity.log_changeset/2)
    |> cast_embed(:metrics_query)
    |> validate_required([:output])
  end

  def implement(%__MODULE__{} = model), do: {:ok, model}
end
