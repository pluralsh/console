defmodule Console.AI.Tools.Workbench.FetchNotes do
  use Console.AI.Tools.Workbench.Base
  alias Console.Schema.{WorkbenchJob, WorkbenchJobResult}

  embedded_schema do
    field :job, :map, virtual: true
  end

  @json_schema Console.priv_file!("tools/empty.json") |> Jason.decode!()

  def name(_), do: "fetch_workbench_notes"
  def json_schema(_), do: @json_schema
  def description(_), do: "Fetch the notes for the current workbench job."

  def changeset(model, attrs) do
    model
    |> cast(attrs, [])
  end

  def implement(_, %__MODULE__{job: %WorkbenchJob{result: %WorkbenchJobResult{} = result}}) do
    Console.mapify(result)
    |> Jason.encode()
  end
end
