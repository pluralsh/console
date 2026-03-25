defmodule Console.AI.Tools.Insight do
  use Ecto.Schema
  import Ecto.Changeset
  require EEx

  embedded_schema do
    field :summary,                 :string
    field :root_cause,              :string
    field :key_evidence,            {:array, :string}
    field :contextual_observations, {:array, :string}
  end

  @valid ~w(summary root_cause key_evidence contextual_observations)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> validate_required(@valid)
  end

  @json_schema Console.priv_file!("tools/insight.json") |> Jason.decode!()

  def json_schema(), do: @json_schema
  def name(), do: "plural_insight"
  def description(), do: "Define an insight for a plural service, cluster, or stack.  All text fields should be in commonmark markdwon format"

  def implement(%__MODULE__{} = insight) do
    insight_template(
      summary: insight.summary,
      root_cause: insight.root_cause,
      key_evidence: insight.key_evidence,
      contextual_observations: insight.contextual_observations
    )
    |> String.trim()
    |> then(& {:ok, &1})
  end

  EEx.function_from_file(:defp, :insight_template, Path.join([:code.priv_dir(:console), "insight.md.eex"]), [:assigns])
end
