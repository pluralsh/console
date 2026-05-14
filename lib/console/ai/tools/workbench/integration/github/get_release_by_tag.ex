defmodule Console.AI.Tools.Workbench.Integration.Github.GetReleaseByTag do
  @moduledoc false

  use Console.AI.Tools.Workbench.Base

  import Tentacat

  alias Console.Schema.WorkbenchTool
  alias Console.Schema.WorkbenchTool.{Configuration, Configuration.GithubConnection}
  alias Console.AI.Tools.Workbench.Integration.Github.{Client, Response}

  embedded_schema do
    field :tool, :map, virtual: true
    field :owner, :string
    field :repo,  :string
    field :tag,   :string
  end

  @json_schema Console.priv_file!("tools/workbench/integration/github/get_release_by_tag.json") |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: n}}), do: "github_#{n}_get_release_by_tag"

  def description(%__MODULE__{tool: %WorkbenchTool{name: n}}),
    do: "Get release by tag (#{n}) via GitHub REST."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(m, attrs), do: m |> cast(attrs, [:owner, :repo, :tag]) |> validate_required([:owner, :repo, :tag])

  def implement(%__MODULE__{tool: %WorkbenchTool{configuration: %Configuration{github: %GithubConnection{}}}} = m) do
    with {:ok, client} <- Client.build(m.tool) do
      get("repos/#{m.owner}/#{m.repo}/releases/tags/#{URI.encode(m.tag)}", client)
      |> Response.json()
    end
  end

  def implement(%__MODULE__{}), do: {:error, "GitHub is not configured for this workbench tool."}
end
