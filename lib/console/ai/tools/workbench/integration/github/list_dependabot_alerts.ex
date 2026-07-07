defmodule Console.AI.Tools.Workbench.Integration.Github.ListDependabotAlerts do
  @moduledoc false

  use Console.AI.Tools.Workbench.Base

  alias Console.Schema.WorkbenchTool
  alias Console.Schema.WorkbenchTool.{Configuration, Configuration.GithubConnection}
  alias Console.AI.Tools.Workbench.Integration.Github.{Client, Response, Query}

  embedded_schema do
    field :tool,       :map, virtual: true
    field :owner,      :string
    field :repo,       :string
    field :classification, :string
    field :state,      :string
    field :severity,   :string
    field :ecosystem,  :string
    field :package,    :string
    field :manifest,   :string
    field :epss_percentage, :string
    field :has,        :string
    field :assignee,   :string
    field :scope,      :string
    field :sort,       :string
    field :direction,  :string
    field :before,     :string
    field :after,      :string
    field :per_page,   :integer
  end

  @json_schema Console.priv_file!("tools/workbench/integration/github/list_dependabot_alerts.json")
               |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: n}}),
    do: "github_#{n}_list_dependabot_alerts"

  def description(%__MODULE__{tool: %WorkbenchTool{name: n}}),
    do: "List dependency vulnerability alerts from Dependabot for a repository (#{n}) via GitHub REST."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(m, attrs) do
    m
    |> cast(attrs, [
      :owner,
      :repo,
      :classification,
      :state,
      :severity,
      :ecosystem,
      :package,
      :manifest,
      :epss_percentage,
      :has,
      :assignee,
      :scope,
      :sort,
      :direction,
      :before,
      :after,
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
      %{}
      |> Query.merge_optional(m, [
        :classification,
        :state,
        :severity,
        :ecosystem,
        :package,
        :manifest,
        :epss_percentage,
        :has,
        :assignee,
        :scope,
        :sort,
        :direction,
        :before,
        :after,
        :per_page
      ])
      |> Query.stringify_params()
      |> then(&Client.json_get(client, "repos/#{m.owner}/#{m.repo}/dependabot/alerts#{Query.qp(&1)}"))
      |> Response.json()
    end
  end

  def implement(%__MODULE__{}), do: {:error, "GitHub is not configured for this workbench tool."}
end
