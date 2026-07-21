defmodule Console.AI.Tools.Workbench.Integration.Docker.SearchTags do
  @moduledoc false

  use Console.AI.Tools.Workbench.Base

  alias Console.AI.Tools.Workbench.Integration.Docker.Client
  alias Console.OCI
  alias Console.Schema.WorkbenchTool

  embedded_schema do
    field :tool,            :map, virtual: true
    field :repository_slug, :string
    field :query,           :string
    field :limit,           :integer, default: 100
  end

  @json_schema Console.priv_file!("tools/workbench/integration/docker/search_tags.json") |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: name}}), do: "docker_#{name}_search_tags"

  def description(%__MODULE__{tool: %WorkbenchTool{name: name}}),
    do: "Search tags in a Docker/OCI repository via #{name}."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(model, attrs) do
    model
    |> cast(attrs, [:repository_slug, :query, :limit])
    |> validate_required([:repository_slug])
    |> validate_number(:limit, greater_than: 0, less_than_or_equal_to: 1000)
  end

  def implement(%__MODULE__{tool: tool, repository_slug: repository_slug, query: query, limit: limit}) do
    with {:ok, client} <- Client.build(tool, repository_slug),
         {:ok, %OCI.Tags{tags: tags, name: name}} <-
           OCI.Client.tags(client, tag_filter(query), "", %OCI.Tags{}, limit || 100) do
      Jason.encode(%{repository: name, tags: tags})
    end
  end

  defp tag_filter(query) when query in [nil, ""], do: fn _ -> true end

  defp tag_filter(query) when is_binary(query) do
    normalized = String.downcase(query)
    fn tag -> tag |> String.downcase() |> String.contains?(normalized) end
  end
end
