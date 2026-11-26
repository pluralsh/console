defmodule Console.AI.Tools.Workbench.Filesystem.Glob do
  use Console.AI.Tools.Workbench.Base
  alias Console.AI.Tools.Workbench.Filesystem, as: Files
  alias Console.Deployments.WorkbenchFiles
  alias Console.Schema.Workbench

  embedded_schema do
    field :workbench,   :map, virtual: true
    field :user,        :map, virtual: true
    field :pattern,     :string
    field :max_results, :integer
  end

  def changeset(model, attrs) do
    model
    |> cast(attrs, [:pattern, :max_results])
    |> validate_required([:pattern])
    |> validate_number(:max_results, greater_than: 0)
  end

  @json_schema Console.priv_file!("tools/workbench/filesystem/glob.json") |> Jason.decode!()

  def json_schema(_), do: @json_schema
  def name(_), do: "workbench_glob_files"
  def description(_), do: "Find files on the workbench filesystem by glob. Patterns are under /workbench, for example /workbench/**/*.md."

  def implement(%__MODULE__{workbench: %Workbench{} = bench, pattern: pattern, max_results: max}) do
    with {:ok, pattern} <- Files.tenant_path(pattern),
         {:ok, files} <- WorkbenchFiles.glob(bench, pattern, max),
      do: {:ok, Files.render_entries(files)}
  end
end
