defmodule Console.AI.Tools.Workbench.Integration.Docker.LatestTags do
  @moduledoc false

  use Console.AI.Tools.Workbench.Base

  alias Console.AI.Tools.Workbench.Integration.Docker.Client
  alias Console.OCI
  alias Console.Schema.WorkbenchTool

  # bounds memory and registry requests for repositories with an unbounded tag history
  @max_tags 50_000

  @semver ~r/^v?(?<major>\d+)\.(?<minor>\d+)(\.(?<patch>\d+))?(?<rest>[-+].*)?$/

  embedded_schema do
    field :tool,               :map, virtual: true
    field :repository_slug,    :string
    field :query,              :string
    field :include_prerelease, :boolean, default: false
    field :limit,              :integer, default: 10
  end

  @json_schema Console.priv_file!("tools/workbench/integration/docker/latest_tags.json") |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: name}}), do: "docker_#{name}_latest_tags"

  def description(%__MODULE__{tool: %WorkbenchTool{name: name}}),
    do: "Find the highest semver tags in a Docker/OCI repository via #{name}. Heavyweight: lists every tag in the repository, so only use it when you need the latest versions."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(model, attrs) do
    model
    |> cast(attrs, [:repository_slug, :query, :include_prerelease, :limit])
    |> validate_required([:repository_slug])
    |> validate_number(:limit, greater_than: 0, less_than_or_equal_to: 100)
  end

  def implement(%__MODULE__{tool: tool, repository_slug: repository_slug} = args) do
    with {:ok, client} <- Client.build(tool, repository_slug),
         {:ok, %OCI.Tags{name: name, tags: tags}} <- OCI.Client.tags(client, tag_filter(args.query), "", %OCI.Tags{}, @max_tags) do
      ranked = latest(tags, args.include_prerelease || false)

      Jason.encode(%{
        repository: name || repository_slug,
        tags: Enum.take(ranked, args.limit || 10),
        tags_scanned: length(tags),
        semver_tags: length(ranked),
        truncated: length(tags) >= @max_tags
      })
    end
  end

  @doc """
  Sorts the semver-parseable tags from highest to lowest version, dropping everything else.
  """
  @spec latest([binary], boolean) :: [binary]
  def latest(tags, include_prerelease \\ false) do
    tags
    |> Enum.flat_map(fn tag ->
      case parse(tag) do
        {:ok, %Version{pre: [_ | _]}} when not include_prerelease -> []
        {:ok, vsn} -> [{vsn, tag}]
        _ -> []
      end
    end)
    |> Enum.sort(fn {v1, t1}, {v2, t2} ->
      case Version.compare(v1, v2) do
        :gt -> true
        :lt -> false
        # build metadata is ignored by semver precedence, so tie-break on the tag for a stable order
        :eq -> t1 >= t2
      end
    end)
    |> Enum.map(&elem(&1, 1))
  end

  defp parse(tag) do
    case Regex.named_captures(@semver, tag) do
      %{"major" => major, "minor" => minor, "patch" => patch, "rest" => rest} ->
        Version.parse("#{major}.#{minor}.#{if patch == "", do: "0", else: patch}#{rest}")
      _ -> :error
    end
  end

  defp tag_filter(query) when query in [nil, ""], do: fn _ -> true end

  defp tag_filter(query) when is_binary(query) do
    normalized = String.downcase(query)
    fn tag -> tag |> String.downcase() |> String.contains?(normalized) end
  end
end
