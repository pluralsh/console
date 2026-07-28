defmodule Console.AI.Tools.Workbench.Sentinel.FetchSentinelRunJob do
  use Console.AI.Tools.Agent.Base
  import Console.Deployments.Policies, only: [allow: 3]
  alias Console.Repo
  alias Console.Deployments.Sentinels
  alias Console.Schema.{SentinelRunJob, User}

  require EEx

  embedded_schema do
    field :user, :map, virtual: true
    field :sentinel_run_job_id, :string
  end

  @valid ~w(sentinel_run_job_id)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> check_uuid(:sentinel_run_job_id)
    |> validate_required([:sentinel_run_job_id])
  end

  @json_schema Console.priv_file!("tools/workbench/sentinel/fetch_sentinel_run_job.json") |> Jason.decode!()

  def json_schema(_), do: @json_schema
  def name(_), do: "plrl_sentinel_run_job"
  def description(_), do: "Fetch a Plural sentinel run job by id, including its execution output."

  def implement(%__MODULE__{user: %User{} = user, sentinel_run_job_id: id}) do
    with %SentinelRunJob{} = job <- Sentinels.get_sentinel_run_job(id),
         {:ok, job} <- allow(job, user, :read) do
      {:ok, String.trim(job_markdown(job: Repo.preload(job, [:cluster, :repository])))}
    else
      nil -> {:error, "could not find sentinel run job with id #{id}"}
      {:error, err} -> {:error, "failed to fetch sentinel run job, reason: #{inspect(err)}"}
      error -> error
    end
  end

  defp cluster(%SentinelRunJob{cluster: %{handle: handle, id: id}}) when is_binary(handle), do: "`#{handle}` (`#{id}`)"
  defp cluster(%SentinelRunJob{cluster_id: id}) when is_binary(id), do: "`#{id}`"
  defp cluster(_), do: "_none_"

  defp fence_language(:junit), do: "xml"
  defp fence_language(_), do: ""

  defp nullable(%DateTime{} = dt), do: "`#{DateTime.to_iso8601(dt)}`"
  defp nullable(value) when is_binary(value) and byte_size(value) > 0, do: "`#{value}`"
  defp nullable(_), do: "_none_"

  EEx.function_from_file(
    :defp,
    :job_markdown,
    Console.priv_filename(["prompts", "workbench", "sentinel", "run_job.md.eex"]),
    [:assigns]
  )
end
