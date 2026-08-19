defmodule Console.AI.Tools.Workbench.Integration.Github.UpdateComment do
  @moduledoc false

  use Console.AI.Tools.Workbench.Base

  import EctoEnum

  alias Console.AI.Tools.Workbench.Integration.Github.{Client, Response}
  alias Console.Schema.WorkbenchTool
  alias Console.Schema.WorkbenchTool.{Configuration, Configuration.GithubConnection}

  defenum Resource,
    issue_comment: 0,
    pull_request_review_comment: 1,
    pull_request_review: 2

  embedded_schema do
    field :tool, :map, virtual: true
    field :owner, :string
    field :repo, :string
    field :resource, Resource
    field :comment_id, :integer
    field :pull_number, :integer
    field :body, :string
  end

  @json_schema Console.priv_file!("tools/workbench/integration/github/update_comment.json") |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: n}}), do: "github_#{n}_update_comment"

  def description(%__MODULE__{tool: %WorkbenchTool{name: n}}),
    do: "Edit a GitHub issue comment, inline pull request review comment, or review summary (#{n}) via REST."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(m, attrs) do
    m
    |> cast(attrs, [:owner, :repo, :resource, :comment_id, :pull_number, :body])
    |> validate_required([:owner, :repo, :resource, :comment_id, :body])
    |> validate_pull_number()
  end

  def implement(%__MODULE__{
        tool: %WorkbenchTool{configuration: %Configuration{github: %GithubConnection{}}}
      } = m) do
    with {:ok, client} <- Client.build(m.tool) do
      update(client, m)
      |> Response.json()
    end
  end

  def implement(%__MODULE__{}), do: {:error, "GitHub is not configured for this workbench tool."}

  defp validate_pull_number(changeset) do
    case get_field(changeset, :resource) do
      resource when resource in [:pull_request_review_comment, :pull_request_review] ->
        validate_required(changeset, [:pull_number])

      _ ->
        changeset
    end
  end

  defp path(%__MODULE__{resource: :issue_comment, owner: owner, repo: repo, comment_id: comment_id}),
    do: "repos/#{owner}/#{repo}/issues/comments/#{comment_id}"

  defp path(%__MODULE__{
         resource: :pull_request_review_comment,
         owner: owner,
         repo: repo,
         comment_id: comment_id
       }),
       do: "repos/#{owner}/#{repo}/pulls/comments/#{comment_id}"

  defp path(%__MODULE__{
         resource: :pull_request_review,
         owner: owner,
         repo: repo,
         pull_number: pull_number,
         comment_id: review_id
       }),
       do: "repos/#{owner}/#{repo}/pulls/#{pull_number}/reviews/#{review_id}"

  defp update(client, %__MODULE__{resource: :pull_request_review} = m),
    do: Client.json_put(client, path(m), %{"body" => m.body})

  defp update(client, %__MODULE__{} = m),
    do: Client.json_patch(client, path(m), %{"body" => m.body})
end
