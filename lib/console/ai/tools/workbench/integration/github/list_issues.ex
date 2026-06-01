defmodule Console.AI.Tools.Workbench.Integration.Github.ListIssues do
  @moduledoc false

  use Console.AI.Tools.Workbench.Base

  import Tentacat

  alias Console.Schema.WorkbenchTool
  alias Console.Schema.WorkbenchTool.{Configuration, Configuration.GithubConnection}
  alias Console.AI.Tools.Workbench.Integration.Github.{Client, Response, Query}

  embedded_schema do
    field :tool,       :map, virtual: true
    field :owner,      :string
    field :repo,       :string
    field :state,      :string
    field :since,      :string
    field :labels,     {:array, :string}
    field :direction,  :string
    field :sort,       :string
    field :after,      :string
    field :page,       :integer
    field :per_page,   :integer
  end

  @json_schema Console.priv_file!("tools/workbench/integration/github/list_issues.json")
               |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: n}}), do: "github_#{n}_list_issues"

  def description(%__MODULE__{tool: %WorkbenchTool{name: n}}),
    do: "List issues for a repository (#{n}) via GitHub REST."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(m, attrs) do
    m
    |> cast(attrs, [
      :owner,
      :repo,
      :state,
      :since,
      :labels,
      :direction,
      :sort,
      :after,
      :page,
      :per_page
    ])
    |> validate_required([:owner, :repo])
  end

  def implement(
        %__MODULE__{
          tool: %WorkbenchTool{configuration: %Configuration{github: %GithubConnection{}}}
        } = m
      ) do
    with {:ok, client} <- Client.build(m.tool) do
      m
      |> then(
        &Query.merge_optional(%{}, &1, [
          :state,
          :since,
          :labels,
          :direction,
          :sort,
          :after,
          :page,
          :per_page
        ])
      )
      |> Query.paginated()
      |> Query.stringify_params()
      |> then(
        &get(
          "repos/#{m.owner}/#{m.repo}/issues#{Query.qp(&1)}",
          client,
          [],
          Query.manual_pagination()
        )
      )
      |> Response.json()
    end
  end

  def implement(%__MODULE__{}), do: {:error, "GitHub is not configured for this workbench tool."}
end
