defmodule Console.Devboxes.PullRequests do
  @moduledoc """
  One-click pull requests from a devbox instance: the user only picks a checkout.  The box writes the title, body and
  commit message from the changes it holds, branches, commits and pushes (`Control.prepare_pull_request`), then
  console opens the pull request like the devbox MCP's `create_pull_request` does.

  The text comes from console's AI proxy (the primary provider's tool model) when console AI is on, otherwise from
  the CLI of an agent the instance bills to a subscription, otherwise a template.  It runs in the background and
  publishes each `Job` on `devbox_instances:<id>:pull_request_jobs`.
  """
  import Console.Deployments.Policies
  import Console.Services.Base, only: [handle_notify: 2]
  alias Console.PubSub
  alias Console.Repo
  alias Console.Deployments.Pr.Git
  alias Console.Devboxes
  alias Console.Devboxes.{Billing, Control, Error, Ingest, ProxyModels}
  alias Console.Schema.{DevboxInstance, DevboxInstanceSession, User}

  defmodule Job do
    @moduledoc "A pull request being prepared for one checkout.  Never stored."
    @type t :: %__MODULE__{}
    defstruct [:id, :instance_id, :repository, :status, :url, :title, :error, :writer]
  end

  @headless ~w(claude codex)a

  @doc """
  Starts preparing a pull request for a checkout of a live instance and returns the running job.
  """
  @spec create(binary, map, User.t) :: {:ok, Job.t} | Console.error
  def create(instance_id, %{repository: repository} = attrs, %User{} = user) do
    with {:ok, inst} <- allow(Devboxes.get_instance!(instance_id), user, :pr),
         {:ok, inst} <- Devboxes.ensure_live(inst),
         {:ok, thread} <- thread(inst, attrs[:thread_id]) do
      job = %Job{id: Ecto.UUID.generate(), instance_id: inst.id, repository: repository, status: :running}
      __MODULE__.spawn_job(fn -> run(job, inst, thread) end)
      publish(job)
    end
  end

  @doc false
  def spawn_job(fun), do: Task.Supervisor.start_child(Console.Devboxes.TaskSupervisor, fun)

  @doc false
  @spec run(Job.t, DevboxInstance.t, DevboxInstanceSession.t | nil) :: {:ok, Job.t}
  def run(%Job{} = job, %DevboxInstance{} = inst, thread) do
    opts = Map.merge(writer(inst, thread), %{repository: job.repository, thread_id: thread && thread.id})
    with {:ok, prepared} <- Control.prepare_pull_request(inst, opts),
         {:ok, pr} <- Ingest.create_devbox_pr(inst, thread, pr_attributes(prepared), %{source: :devbox, metadata: %{writer: prepared[:writer]}}) do
      publish(%{job | status: :succeeded, url: pr.url, title: pr.title, writer: prepared[:writer]})
    else
      err -> publish(%{job | status: :failed, error: message(err)})
    end
  end

  @doc false
  def writer(%DevboxInstance{} = inst, thread) do
    case ProxyModels.writer_model() do
      model when is_binary(model) -> %{model: model}
      nil -> %{agent: subscription_agent(inst, thread)}
    end
  end

  # the thread's agent, then the instance's, then any other agent with a headless CLI billed to a subscription
  defp subscription_agent(inst, thread) do
    subscribed = for %{billing: :subscription, agent: a} <- Billing.launches(inst), a in @headless, do: a
    Enum.find([thread && thread.agent, inst.agent | subscribed], &(&1 in subscribed))
  end

  defp pr_attributes(prepared) do
    %{
      repository: "https://" <> Git.normalize_url(prepared.remote_url),
      title: prepared.title,
      body: prepared.body,
      head_branch: prepared.head_branch,
      base_branch: prepared.base_branch,
      commit_shas: [%{branch: prepared.head_branch, sha: prepared.head_sha}, %{branch: prepared.base_branch, sha: prepared.base_sha}]
    }
  end

  defp thread(_, empty) when empty in [nil, ""], do: {:ok, nil}
  defp thread(%DevboxInstance{id: id}, thread_id) do
    case Repo.get(DevboxInstanceSession, thread_id) do
      %DevboxInstanceSession{instance_id: ^id} = thread -> {:ok, thread}
      _ -> {:error, "thread #{thread_id} does not belong to this instance"}
    end
  end

  defp message({:error, msg}) when is_binary(msg), do: msg
  defp message({:error, %Ecto.Changeset{} = cs}), do: inspect(cs.errors)
  defp message({:error, _} = err) do
    case Error.control(err) do
      {:error, %{message: msg}} when is_binary(msg) -> msg
      {:error, msg} when is_binary(msg) -> msg
      _ -> "couldn't create the pull request"
    end
  end
  defp message(_), do: "couldn't create the pull request"

  defp publish(%Job{} = job), do: handle_notify(PubSub.DevboxPullRequestJobUpdated, job)
end
