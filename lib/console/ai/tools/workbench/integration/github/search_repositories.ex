defmodule Console.AI.Tools.Workbench.Integration.Github.SearchRepositories do
  @moduledoc false

  use Console.AI.Tools.Workbench.Base

  alias Console.Schema.WorkbenchTool
  alias Console.Schema.WorkbenchTool.{Configuration, Configuration.GithubConnection}
  alias Console.AI.Tools.Workbench.Integration.Github.{Client, Response, Query}

  embedded_schema do
    field :tool,            :map, virtual: true
    field :query,           :string
    field :sort,            :string
    field :order,           :string
    field :page,            :integer
    field :per_page,        :integer
    field :minimal_output,  :boolean
  end

  @json_schema Console.priv_file!("tools/workbench/integration/github/search_repositories.json") |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: n}}), do: "github_#{n}_search_repositories"

  def description(%__MODULE__{tool: %WorkbenchTool{name: n}}),
    do: "Search repositories (#{n}) via GitHub REST."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(m, attrs) do
    m
    |> cast(attrs, [:query, :sort, :order, :page, :per_page, :minimal_output])
    |> validate_required([:query])
  end

  def implement(%__MODULE__{tool: %WorkbenchTool{configuration: %Configuration{github: %GithubConnection{}}}} = m) do
    with {:ok, client} <- Client.build(m.tool) do
      %{q: m.query}
      |> Query.merge_optional(m, [:sort, :order, :page, :per_page, :minimal_output])
      |> Enum.reject(fn {_, v} -> is_nil(v) end)
      |> Map.new()
      |> then(&Tentacat.Search.repositories(client, &1))
      |> Response.json()
    end
  end

  def implement(%__MODULE__{}), do: {:error, "GitHub is not configured for this workbench tool."}
end
