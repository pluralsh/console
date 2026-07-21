defmodule Console.AI.Tools.Workbench.Integration.Docker.FetchManifest do
  @moduledoc false

  use Console.AI.Tools.Workbench.Base

  alias Console.AI.Tools.Workbench.Integration.Docker.Client
  alias Console.Schema.WorkbenchTool

  embedded_schema do
    field :tool,            :map, virtual: true
    field :repository_slug, :string
    field :tag,             :string
  end

  @json_schema Console.priv_file!("tools/workbench/integration/docker/fetch_manifest.json") |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: name}}), do: "docker_#{name}_fetch_manifest"

  def description(%__MODULE__{tool: %WorkbenchTool{name: name}}),
    do: "Fetch a Docker/OCI image manifest by repository slug and tag via #{name}."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(model, attrs) do
    model
    |> cast(attrs, [:repository_slug, :tag])
    |> validate_required([:repository_slug, :tag])
  end

  def implement(%__MODULE__{tool: tool, repository_slug: repository_slug, tag: tag}) do
    with {:ok, client} <- Client.build(tool, repository_slug),
         {:ok, manifest} <- Console.OCI.Client.manifest(client, tag) do
      Jason.encode(%{repository: repository_slug, tag: tag, manifest: Client.normalize(manifest)})
    end
  end
end
