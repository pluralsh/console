defmodule Console.AI.Tools.Workbench.Integration.Bitbucket.ReactToComment do
  @moduledoc false

  use Console.AI.Tools.Workbench.Base

  import EctoEnum

  alias Console.Schema.WorkbenchTool
  alias Console.Schema.WorkbenchTool.{Configuration, Configuration.BitbucketConnection}

  defenum Resource,
    pull_request: 0,
    issue: 1

  embedded_schema do
    field :tool, :map, virtual: true
    field :repository, :string
    field :resource, Resource
    field :resource_id, :integer
    field :comment_id, :integer
    field :reaction, :string
  end

  @json_schema Console.priv_file!("tools/workbench/integration/bitbucket/react_to_comment.json") |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: n}}), do: "bitbucket_#{n}_react_to_comment"

  def description(%__MODULE__{tool: %WorkbenchTool{name: n}}),
    do:
      "Attempt to react to a Bitbucket Cloud pull request or issue comment (#{n}). Bitbucket Cloud currently has no documented REST endpoint for comment emoji/like reactions, so this returns an unsupported error."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(m, attrs) do
    m
    |> cast(attrs, [:repository, :resource, :resource_id, :comment_id, :reaction])
    |> validate_required([:repository, :resource, :resource_id, :comment_id, :reaction])
  end

  def implement(%__MODULE__{
        tool: %WorkbenchTool{configuration: %Configuration{bitbucket: %BitbucketConnection{}}}
      }),
      do:
        {:error,
         "Bitbucket Cloud REST API does not expose a documented endpoint for adding emoji/like reactions to pull request or issue comments. Data Center supports comment reactions via the comment-likes API, but Cloud only documents comment create/update/delete and pull request comment resolve/reopen."}

  def implement(%__MODULE__{}), do: {:error, "Bitbucket Cloud is not configured for this workbench tool."}
end
