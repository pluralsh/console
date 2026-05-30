defmodule Console.AI.Tools.Workbench.Integration.Github.SearchIssues do
  @moduledoc false

  use Console.AI.Tools.Workbench.Base

  alias Console.Schema.WorkbenchTool
  alias Console.Schema.WorkbenchTool.{Configuration, Configuration.GithubConnection}
  alias Console.AI.Tools.Workbench.Integration.Github.{Client, Response, Query}

  embedded_schema do
    field :tool,      :map, virtual: true
    field :query,     :string
    field :owner,     :string
    field :repo,      :string
    field :sort,      :string
    field :order,     :string
    field :page,      :integer
    field :per_page,  :integer
  end

  @json_schema Console.priv_file!("tools/workbench/integration/github/search_issues.json")
               |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: n}}), do: "github_#{n}_search_issues"

  def description(%__MODULE__{tool: %WorkbenchTool{name: n}}),
    do: "Search issues (#{n}) via GitHub REST search API."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(m, attrs) do
    m
    |> cast(attrs, [:query, :owner, :repo, :sort, :order, :page, :per_page])
    |> validate_required([:query])
  end

  def implement(
        %__MODULE__{
          tool: %WorkbenchTool{configuration: %Configuration{github: %GithubConnection{}}}
        } = m
      ) do
    with {:ok, client} <- Client.build(m.tool) do
      %{q: scoped_query(m)}
      |> Query.merge_optional(m, [:sort, :order, :page, :per_page])
      |> Query.paginated()
      |> Enum.reject(fn {_, v} -> is_nil(v) end)
      |> Map.new()
      |> then(&Tentacat.Search.issues(client, &1, Query.manual_pagination()))
      |> Response.json()
    end
  end

  def implement(%__MODULE__{}), do: {:error, "GitHub is not configured for this workbench tool."}

  defp scoped_query(%{query: query, owner: o, repo: r}) when is_binary(o) and is_binary(r),
    do: query <> " repo:#{o}/#{r} is:issue"

  defp scoped_query(%{query: query}), do: query
end
