defmodule Console.AI.Tools.Workbench.Filesystem.Read do
  use Console.AI.Tools.Workbench.Base
  alias Console.AI.Tools.Workbench.Filesystem, as: Files
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

  @json_schema Console.priv_file!("tools/workbench/filesystem/read.json") |> Jason.decode!()

  def json_schema(_), do: @json_schema
  def name(_), do: "workbench_read_file"
  def description(_), do: "Read a text file from the workbench filesystem. Paths are under /workbench. Large or binary files return a download URL instead of their contents."

  def implement(%__MODULE__{workbench: %Workbench{} = bench, user: %User{} = user, path: path}) do
    with {:ok, path} <- Files.tenant_path(path),
         {:ok, body} <- Files.read(bench, path, user),
      do: {:ok, Files.render_read(body)}
  end
end
