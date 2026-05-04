defmodule Console.AI.Tools.Workbench.Coding.PullRequests do
  use Console.AI.Tools.Agent.Base
  alias Console.Repo
  alias Console.Schema.{WorkbenchJob, PullRequest}

  embedded_schema do
    field :job, :map, virtual: true
  end

  @json_schema Console.priv_file!("tools/empty.json") |> Jason.decode!()

  def json_schema(_), do: @json_schema
  def name(_), do: "pull_requests"
  def description(_), do: "Lists pull request details that have been created so far for the given job"

  def changeset(model, attrs) do
    model
    |> cast(attrs, [])
  end

  def implement(%__MODULE__{job: %WorkbenchJob{id: id}}) do
    PullRequest.for_workbench_job(id)
    |> Repo.all()
    |> Enum.map(&format/1)
    |> Jason.encode()
  end
  def implement(_), do: {:error, "no job provided"}

  defp format(%PullRequest{} = pr) do
    %{
      title: pr.title,
      url: pr.url,
      body: pr.body,
      status: pr.status,
      head: pr.ref,
      base: pr.base,
      latest_commit: pr.commit_sha,
      created_at: pr.inserted_at,
    }
  end
end
