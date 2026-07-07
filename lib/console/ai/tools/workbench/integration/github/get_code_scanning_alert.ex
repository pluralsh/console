defmodule Console.AI.Tools.Workbench.Integration.Github.GetCodeScanningAlert do
  @moduledoc false

  use Console.AI.Tools.Workbench.Base

  alias Console.Schema.WorkbenchTool
  alias Console.Schema.WorkbenchTool.{Configuration, Configuration.GithubConnection}
  alias Console.AI.Tools.Workbench.Integration.Github.{Client, Response}

  embedded_schema do
    field :tool,          :map, virtual: true
    field :owner,         :string
    field :repo,          :string
    field :alert_number,  :integer
  end

  @json_schema Console.priv_file!("tools/workbench/integration/github/get_code_scanning_alert.json")
               |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: n}}),
    do: "github_#{n}_get_code_scanning_alert"

  def description(%__MODULE__{tool: %WorkbenchTool{name: n}}),
    do: "Get one code scanning alert for a repository (#{n}) via GitHub REST."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(m, attrs) do
    m
    |> cast(attrs, [:owner, :repo, :alert_number])
    |> validate_required([:owner, :repo, :alert_number])
  end

  def implement(
        %__MODULE__{
          tool: %WorkbenchTool{configuration: %Configuration{github: %GithubConnection{}}}
        } = m
      ) do
    with {:ok, client} <- Client.build(m.tool) do
      client
      |> Client.json_get("repos/#{m.owner}/#{m.repo}/code-scanning/alerts/#{m.alert_number}")
      |> Response.json()
    end
  end

  def implement(%__MODULE__{}), do: {:error, "GitHub is not configured for this workbench tool."}
end
