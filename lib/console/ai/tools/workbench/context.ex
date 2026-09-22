defmodule Console.AI.Tools.Workbench.Context do
  use Console.AI.Tools.Workbench.Base
  alias Console.Schema.WorkbenchJob

  embedded_schema do
    field :job, :map, virtual: true
  end

  @json_schema Console.priv_file!("tools/empty.json") |> Jason.decode!()

  def name(_), do: "workbench_context"
  def json_schema(_), do: @json_schema

  def description(_),
    do:
      "Get the current workbench objective, authoritative current time, and URL."

  def changeset(model, attrs), do: cast(model, attrs, [])

  def implement(%__MODULE__{job: %WorkbenchJob{} = job}) do
    Jason.encode(%{
      objective: WorkbenchJob.objective(job),
      current_time: Timex.now() |> Timex.format!("{ISO:Extended}"),
      url: Console.url("/workbenches/#{job.workbench_id}/jobs/#{job.id}")
    })
  end
end
