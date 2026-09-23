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
    field :page_size,       :integer, default: 100
    field :cursor,          :string
  end

  @json_schema Console.priv_file!("tools/workbench/integration/docker/search_tags.json") |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: name}}), do: "docker_#{name}_search_tags"

  def description(%__MODULE__{tool: %WorkbenchTool{name: name}}),
    do: "Search tags in a Docker/OCI repository via #{name}, one page at a time (paginate with next_cursor)."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(model, attrs) do
    model
    |> cast(attrs, [:repository_slug, :query, :page_size, :cursor])
    |> validate_required([:repository_slug])
    |> validate_number(:page_size, greater_than: 0, less_than_or_equal_to: 1000)
  end

  def implement(%__MODULE__{tool: tool, repository_slug: repository_slug} = args) do
    with {:ok, client} <- Client.build(tool, repository_slug),
         {:ok, %{name: name, tags: tags, next_cursor: next}} <-
           OCI.Client.tags_page(client,
             page_size: args.page_size || 100,
             cursor: cursor(args.cursor),
             filter: tag_filter(args.query)
           ) do
      Jason.encode(%{repository: name, tags: tags, next_cursor: next})
    end
  end

  defp cursor(c) when c in [nil, ""], do: nil
  defp cursor(c), do: c

  defp tag_filter(query) when query in [nil, ""], do: fn _ -> true end

  defp tag_filter(query) when is_binary(query) do
    normalized = String.downcase(query)
    fn tag -> tag |> String.downcase() |> String.contains?(normalized) end
  end
end
