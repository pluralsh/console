defmodule Console.AI.Tools.Workbench.Integration.Github.PullRequestReviewWrite do
  @moduledoc false

  use Console.AI.Tools.Workbench.Base

  import EctoEnum
  import Tentacat

  alias Console.Schema.WorkbenchTool
  alias Console.Schema.WorkbenchTool.{Configuration, Configuration.GithubConnection}
  alias Console.AI.Tools.Workbench.Integration.Github.{Client, Response}

  defenum Method,
    create: 0,
    submit: 1,
    delete: 2

  embedded_schema do
    field :tool,          :map, virtual: true
    field :owner,         :string
    field :repo,          :string
    field :pull_number,   :integer
    field :method,        Method
    field :commit_id,     :string
    field :body,          :string
    field :event,         :string
    field :comments,      {:array, :map}
    field :review_id,     :integer
    field :thread_id,     :string
  end

  @json_schema Console.priv_file!("tools/workbench/integration/github/pull_request_review_write.json") |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: n}}), do: "github_#{n}_pull_request_review_write"

  def description(%__MODULE__{tool: %WorkbenchTool{name: n}}),
    do: "Create, submit, or delete a pull request review (#{n}) via GitHub REST."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(m, attrs) do
    m
    |> cast(attrs, [
      :owner,
      :repo,
      :pull_number,
      :method,
      :commit_id,
      :body,
      :event,
      :comments,
      :review_id,
      :thread_id
    ])
    |> validate_required([:owner, :repo, :pull_number, :method])
  end

  def implement(%__MODULE__{
        tool: %WorkbenchTool{configuration: %Configuration{github: %GithubConnection{}}},
        method: :create
      } = m) do
    with {:ok, client} <- Client.build(m.tool) do
      %{}
      |> maybe_put(m.commit_id, "commit_id")
      |> maybe_put(m.body, "body")
      |> maybe_put(m.event, "event")
      |> maybe_comments(m.comments)
      |> then(&Tentacat.Pulls.Reviews.create(client, m.owner, m.repo, m.pull_number, &1))
      |> Response.json()
    end
  end

  def implement(%__MODULE__{
        tool: %WorkbenchTool{configuration: %Configuration{github: %GithubConnection{}}},
        method: :submit,
        review_id: rid
      } = m)
      when is_integer(rid) do
    with {:ok, client} <- Client.build(m.tool) do
      %{}
      |> maybe_put(m.body, "body")
      |> maybe_put(m.event, "event")
      |> then(&post("repos/#{m.owner}/#{m.repo}/pulls/#{m.pull_number}/reviews/#{rid}/events", client, &1))
      |> Response.json()
    end
  end

  def implement(%__MODULE__{
        tool: %WorkbenchTool{configuration: %Configuration{github: %GithubConnection{}}},
        method: :delete,
        review_id: rid
      } = m)
      when is_integer(rid) do
    with {:ok, client} <- Client.build(m.tool) do
      delete("repos/#{m.owner}/#{m.repo}/pulls/#{m.pull_number}/reviews/#{rid}", client, "")
      |> Response.json()
    end
  end

  def implement(%__MODULE__{tool: %WorkbenchTool{configuration: %Configuration{github: %GithubConnection{}}}}) do
    {:error,
     "pull_request_review_write: unsupported method (thread resolve uses GraphQL); missing fields"}
  end

  def implement(%__MODULE__{}), do: {:error, "GitHub is not configured for this workbench tool."}

  defp maybe_put(acc, nil, _), do: acc
  defp maybe_put(acc, v, k), do: Map.put(acc, k, v)

  defp maybe_comments(acc, nil), do: acc
  defp maybe_comments(acc, list) when is_list(list), do: Map.put(acc, "comments", list)
  defp maybe_comments(acc, _), do: acc
end
