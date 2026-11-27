defmodule Console.AI.Tools.Workbench.Filesystem.Mkdir do
  use Console.AI.Tools.Workbench.Base
  alias Console.AI.Tools.Workbench.Filesystem, as: Files
  alias Console.Deployments.WorkbenchFiles
  alias Console.Schema.{User, Workbench}

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

  @json_schema Console.priv_file!("tools/workbench/filesystem/mkdir.json") |> Jason.decode!()

  def json_schema(_), do: @json_schema
  def name(_), do: "workbench_mkdir"
  def description(_), do: "Create a directory on the workbench filesystem, including any missing parents. Paths are under /workbench. Requires write access to the workbench."

  def implement(%__MODULE__{workbench: %Workbench{id: id}, user: %User{} = user, path: path}) do
    with {:ok, path} <- Files.tenant_path(path),
         {:ok, file} <- WorkbenchFiles.create_directory(path, id, user),
      do: {:ok, Files.render_file(file)}
  end
end
