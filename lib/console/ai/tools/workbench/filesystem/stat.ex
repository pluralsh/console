defmodule Console.AI.Tools.Workbench.Filesystem.Stat do
  use Console.AI.Tools.Workbench.Base
  alias Console.AI.Tools.Workbench.Filesystem, as: Files
  alias Console.Deployments.WorkbenchFiles
  alias Console.Schema.Workbench

  embedded_schema do
    field :workbench, :map, virtual: true
    field :user,      :map, virtual: true
    field :path,      :string
  end

  def changeset(model, attrs) do
    model
    |> cast(attrs, [:path])
    |> validate_required([:path])
  end

  @json_schema Console.priv_file!("tools/workbench/filesystem/stat.json") |> Jason.decode!()

  def json_schema(_), do: @json_schema
  def name(_), do: "workbench_stat_file"
  def description(_), do: "Stat one file or directory on the workbench filesystem. Paths are under /workbench."

  def implement(%__MODULE__{workbench: %Workbench{} = bench, path: path}) do
    with {:ok, path} <- Files.tenant_path(path),
         {:ok, file} <- WorkbenchFiles.stat(bench, path),
      do: {:ok, Files.render_file(file)}
  end
end
