defmodule Console.AI.Tools.Workbench.Filesystem.Write do
  use Console.AI.Tools.Workbench.Base
  alias Console.AI.Tools.Workbench.Filesystem, as: Files
  alias Console.Deployments.WorkbenchFiles
  alias Console.Schema.{User, Workbench}

  embedded_schema do
    field :workbench, :map, virtual: true
    field :user,      :map, virtual: true
    field :path,      :string
    field :content,   :string
  end

  # One cast, so empty_values: [] applies to validate_required. A later cast
  # merges back onto the first changeset and restores empty_values to [""],
  # which rejects an empty file body as blank.
  def changeset(model, attrs) do
    model
    |> cast(attrs, [:path, :content], empty_values: [])
    |> validate_required([:path, :content])
    |> validate_change(:path, fn :path, path ->
      if String.trim(path) == "", do: [path: "can't be blank"], else: []
    end)
  end

  @json_schema Console.priv_file!("tools/workbench/filesystem/write.json") |> Jason.decode!()

  def json_schema(_), do: @json_schema
  def name(_), do: "workbench_write_file"
  def description(_), do: "Create or replace a text file on the workbench filesystem. Paths are under /workbench. Requires write access to the workbench."

  def implement(%__MODULE__{workbench: %Workbench{id: id}, user: %User{} = user, path: path, content: content}) do
    with {:ok, path} <- Files.tenant_path(path),
         :ok <- Files.cap_write(content),
         {:ok, file} <- WorkbenchFiles.write_file(%{path: path, content: content}, id, user),
      do: {:ok, Files.render_file(file)}
  end
end
