defmodule Console.AI.Tools.Workbench.Filesystem.Move do
  use Console.AI.Tools.Workbench.Base
  alias Console.AI.Tools.Workbench.Filesystem, as: Files
  alias Console.Deployments.WorkbenchFiles
  alias Console.Schema.{User, Workbench}

  embedded_schema do
    field :workbench, :map, virtual: true
    field :user,      :map, virtual: true
    field :source,    :string
    field :target,    :string
  end

  def changeset(model, attrs) do
    model
    |> cast(attrs, [:source, :target])
    |> validate_required([:source, :target])
  end

  @json_schema Console.priv_file!("tools/workbench/filesystem/move.json") |> Jason.decode!()

  def json_schema(_), do: @json_schema
  def name(_), do: "workbench_move_file"
  def description(_), do: "Move or rename a file or directory on the workbench filesystem. Paths are under /workbench. Requires write access to the workbench."

  def implement(%__MODULE__{workbench: %Workbench{id: id}, user: %User{} = user, source: source, target: target}) do
    with {:ok, source} <- Files.tenant_path(source),
         {:ok, target} <- Files.tenant_path(target),
         {:ok, file} <- WorkbenchFiles.move_file(source, target, id, user),
      do: {:ok, Files.render_file(file)}
  end
end
