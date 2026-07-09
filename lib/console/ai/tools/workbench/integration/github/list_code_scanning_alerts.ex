defmodule Console.AI.Tools.Workbench.Integration.Github.ListCodeScanningAlerts do
  @moduledoc false

  use Console.AI.Tools.Workbench.Base

  alias Console.Schema.WorkbenchTool
  alias Console.Schema.WorkbenchTool.{Configuration, Configuration.GithubConnection}
  alias Console.AI.Tools.Workbench.Integration.Github.{Client, Response, Query}

  embedded_schema do
    field :tool,          :map, virtual: true
    field :owner,         :string
    field :repo,          :string
    field :state,         :string
    field :ref,           :string
    field :severity,      :string
    field :tool_name,     :string
    field :page,          :integer
    field :per_page,      :integer
  end

  @json_schema Console.priv_file!("tools/workbench/integration/github/list_code_scanning_alerts.json")
               |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: n}}),
    do: "github_#{n}_list_code_scanning_alerts"

  def description(%__MODULE__{tool: %WorkbenchTool{name: n}}),
    do: "List code scanning alerts for a repository (#{n}) via GitHub REST."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(m, attrs) do
    m
    |> cast(attrs, [:owner, :repo, :state, :ref, :severity, :tool_name, :page, :per_page])
    |> validate_required([:owner, :repo])
  end

  def implement(
        %__MODULE__{
          tool: %WorkbenchTool{configuration: %Configuration{github: %GithubConnection{}}}
        } = m
      ) do
    with {:ok, client} <- Client.build(m.tool) do
      %{}
      |> Query.merge_optional(m, [:state, :ref, :severity, :tool_name, :page, :per_page])
      |> Query.paginated()
      |> Query.stringify_params()
      |> then(&Client.json_get(client, "repos/#{m.owner}/#{m.repo}/code-scanning/alerts#{Query.qp(&1)}"))
      |> Response.json()
    end
  end

  def implement(%__MODULE__{}), do: {:error, "GitHub is not configured for this workbench tool."}
end
