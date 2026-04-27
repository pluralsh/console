defmodule Console.AI.Tools.Workbench.Eval do
  @moduledoc """
  The tool for evaluating the quality of a workbench job.
  """
  use Console.AI.Tools.Workbench.Base
  alias Console.Repo
  alias Console.Schema.{WorkbenchJob, WorkbenchEval, WorkbenchEvalResult}

  embedded_schema do
    field :job,     :map, virtual: true
    field :eval,    :map, virtual: true
    field :grade,   :integer
    field :summary, :string
    field :prompt,  :string
    field :result,  :string
    field :logic,   :string
  end

  @json_schema Console.priv_file!("tools/workbench/eval.json") |> Jason.decode!()

  def name(_), do: "workbench_eval"
  def json_schema(_), do: @json_schema
  def description(_), do: "Evaluate the quality of the workbench job."

  def changeset(model, attrs) do
    model
    |> cast(attrs, [:grade, :summary, :prompt, :result, :logic])
    |> validate_inclusion(:grade, 0..10, message: "grade must be between 0 and 10")
    |> validate_required([:grade, :summary])
  end

  def implement(%__MODULE__{job: %WorkbenchJob{} = job, eval: %WorkbenchEval{} = eval} = model) do
    %WorkbenchEvalResult{workbench_eval_id: eval.id, workbench_job_id: job.id}
    |> WorkbenchEvalResult.changeset(%{
      grade: model.grade,
      feedback: %{
        summary: model.summary,
        prompt: model.prompt,
        result: model.result,
        logic: model.logic
      }
    })
    |> Repo.insert()
  end
end
