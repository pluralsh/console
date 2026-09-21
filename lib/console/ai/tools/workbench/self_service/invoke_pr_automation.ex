defmodule Console.AI.Tools.Workbench.SelfService.InvokePrAutomation do
  use Console.AI.Tools.Workbench.Base
  alias Console.AI.Tool
  alias Console.Deployments.Git
  alias Console.Schema.{WorkbenchJob, PullRequest}

  embedded_schema do
    field :pr_automation_id, :string
    field :context, :string
    field :branch, :string
    field :identifier, :string
    field :job, :map, virtual: true
  end

  @valid ~w(pr_automation_id context branch identifier)a
  @json_schema Console.priv_file!("tools/workbench/self_service/invoke_pr_automation.json") |> Jason.decode!()

  def json_schema(_), do: @json_schema
  def name(_), do: "workbench_invoke_pr_automation"
  def description(_), do: """
  Invoke a PR automation to create a pull request for a clear GitOps provisioning pathway.
  The generated pull request is automatically associated with the current workbench job.
  Call this only after confirming a relevant automation and filling a valid context. Prefer a single invocation.
  """

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> validate_required([:pr_automation_id, :branch])
  end

  def implement(%__MODULE__{pr_automation_id: pra_id, branch: branch} = model) do
    with %{} = user <- Tool.actor(),
         %WorkbenchJob{id: job_id, workbench_id: workbench_id} <- job(model),
         {:ok, %PullRequest{} = pr} <-
           Git.create_pull_request(
             %{workbench_job_id: job_id, workbench_id: workbench_id},
             get_context(model),
             pra_id,
             branch,
             model.identifier,
             user
           ) do
      Jason.encode(%{
        id: pr.id,
        url: pr.url,
        title: pr.title,
        status: pr.status,
        workbench_job_id: pr.workbench_job_id,
        workbench_id: pr.workbench_id
      })
    else
      nil -> {:ok, "no workbench job or user available for this invocation"}
      {:error, %Ecto.Changeset{} = cs} ->
        {:ok, "failed to create pull request: #{inspect(Console.GraphQl.Helpers.resolve_changeset(cs))}"}
      {:error, err} when is_binary(err) -> {:ok, "failed to create pull request: #{err}"}
      {:error, err} -> {:ok, "failed to create pull request: #{inspect(err)}"}
      err -> {:ok, "failed to create pull request: #{inspect(err)}"}
    end
  end

  defp job(%__MODULE__{job: %WorkbenchJob{} = job}), do: job
  defp job(_) do
    case Tool.context() do
      %{job: %WorkbenchJob{} = job} -> job
      _ -> nil
    end
  end

  defp get_context(%__MODULE__{context: ctx}) when is_binary(ctx) do
    case Jason.decode(ctx) do
      {:ok, %{} = map} -> map
      _ -> %{}
    end
  end
  defp get_context(_), do: %{}
end
