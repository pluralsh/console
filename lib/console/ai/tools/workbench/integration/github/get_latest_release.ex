defmodule Console.AI.Tools.Workbench.Integration.Github.GetLatestRelease do
  @moduledoc false

  use Console.AI.Tools.Workbench.Base

  alias Console.Schema.WorkbenchTool
  alias Console.Schema.WorkbenchTool.{Configuration, Configuration.GithubConnection}
  alias Console.AI.Tools.Workbench.Integration.Github.{Client, Response}

  embedded_schema do
    field :tool,  :map, virtual: true
    field :owner, :string
    field :repo,  :string
  end

  @json_schema Console.priv_file!("tools/workbench/integration/github/get_latest_release.json") |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: n}}), do: "github_#{n}_get_latest_release"

  def description(%__MODULE__{tool: %WorkbenchTool{name: n}}),
    do: "Get latest release (#{n}) via GitHub REST."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(m, attrs), do: m |> cast(attrs, [:owner, :repo]) |> validate_required([:owner, :repo])

  def implement(%__MODULE__{tool: %WorkbenchTool{configuration: %Configuration{github: %GithubConnection{}}}} = m) do
    with {:ok, client} <- Client.build(m.tool) do
      Tentacat.Releases.latest(client, m.owner, m.repo)
      |> Response.json()
    end
  end

  def implement(%__MODULE__{}), do: {:error, "GitHub is not configured for this workbench tool."}
end
