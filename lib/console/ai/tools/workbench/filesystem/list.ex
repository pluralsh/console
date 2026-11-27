defmodule Console.AI.Tools.Workbench.Filesystem.List do
  use Console.AI.Tools.Workbench.Base
  alias Console.AI.Tools.Workbench.Filesystem, as: Files
  alias Console.Deployments.WorkbenchFiles
  alias Console.Schema.Workbench

  embedded_schema do
    field :workbench, :map, virtual: true
    field :user,      :map, virtual: true
    field :path,      :string, default: "/"
  end

  def changeset(model, attrs) do
    model
    |> cast(attrs, [:path])
  end

  @json_schema Console.priv_file!("tools/workbench/filesystem/list.json") |> Jason.decode!()

  def json_schema(_), do: @json_schema
  def name(_), do: "workbench_list_files"
  def description(_), do: "List the files and directories directly inside a workbench filesystem directory. Paths are under /workbench, the workbench's shared memory."

  def implement(%__MODULE__{workbench: %Workbench{} = bench, path: path}) do
    with {:ok, path} <- Files.tenant_path(path || "/"),
         {:ok, files} <- WorkbenchFiles.list(bench, path),
      do: {:ok, Files.render_entries(files)}
  end
end
