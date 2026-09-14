defmodule Console.AI.Tools.Workbench.ObservabilityResult do
  use Console.AI.Tools.Workbench.Base
  alias Console.Schema.WorkbenchJobActivity
  alias Console.Schema.{User, WorkbenchJob}
  alias Console.Schema.WorkbenchJobResult.ToolQuery
  alias Console.AI.Workbench.Toolchain

  embedded_schema do
    field :job, :map, virtual: true
    field :user, :map, virtual: true
    field :output, :string

    embeds_one :metrics_query, ToolQuery, on_replace: :update
    embeds_many :logs, Console.Schema.WorkbenchJobActivity.WorkbenchJobResult.Log, on_replace: :delete
    embeds_many :traces, Console.Schema.WorkbenchJobActivity.WorkbenchJobResult.Trace, on_replace: :delete

    embeds_many :metrics_queries, ToolQuery, on_replace: :delete
    embeds_many :logs_queries, ToolQuery, on_replace: :delete
    embeds_many :traces_queries, ToolQuery, on_replace: :delete
    embeds_one :traces_query, ToolQuery, on_replace: :update
  end

  @json_schema Console.priv_file!("tools/workbench/observability_result.json") |> Jason.decode!()

  def name(), do: "observability_result"
  def name(_), do: name()
  def json_schema(), do: @json_schema
  def json_schema(_), do: json_schema()
  def description() do
    "Complete the observability subagent session. The output's first line must specifically describe the work completed or the outcome reached, without a generic heading such as \"Conclusion\" or \"Result\". The remaining output should thoroughly summarize the work done in response to the original prompt so any future agent can understand it without reviewing this session."
  end
  def description(_), do: description()

  def changeset(model, attrs) do
    model
    |> cast(attrs, [:output])
    |> cast_embed(:logs, with: &WorkbenchJobActivity.log_changeset/2)
    |> cast_embed(:traces, with: &WorkbenchJobActivity.trace_changeset/2)
    |> cast_embed(:metrics_query)
    |> cast_embed(:traces_query)
    |> cast_embed(:logs_queries)
    |> cast_embed(:metrics_queries)
    |> cast_embed(:traces_queries)
    |> validate_required([:output])
  end

  def implement(%__MODULE__{job: %WorkbenchJob{} = job, user: %User{} = user} = model) do
    with :ok <- Toolchain.validate_result(job, model, user), do: {:ok, model}
  end
end
