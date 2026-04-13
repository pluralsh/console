defmodule Console.Deployments.Workbenches do
  use Console.Services.Base
  use Nebulex.Caching
  import Console.Deployments.Policies
  alias Console.Schema.{
    User,
    Workbench,
    WorkbenchJob,
    WorkbenchTool,
    WorkbenchJobActivity,
    WorkbenchJobResult,
    WorkbenchCron,
    WorkbenchPrompt,
    WorkbenchSkill,
    WorkbenchWebhook,
    WorkbenchJobActivityAgentRun,
    WorkbenchJobThought
  }
  alias Console.Deployments.Settings
  alias Console.PubSub

  @type error :: Console.error
  @type workbench_resp :: {:ok, Workbench.t()} | error
  @type tool_resp :: {:ok, WorkbenchTool.t()} | error
  @type job_resp :: {:ok, WorkbenchJob.t()} | error
  @type activity_resp :: {:ok, WorkbenchJobActivity.t()} | error
  @type cron_resp :: {:ok, WorkbenchCron.t()} | error
  @type prompt_resp :: {:ok, WorkbenchPrompt.t()} | error
  @type skill_resp :: {:ok, WorkbenchSkill.t()} | error
  @type webhook_resp :: {:ok, WorkbenchWebhook.t()} | error

  @cache_adapter Console.conf(:cache_adapter)
  @ttl :timer.hours(6)

  def get_workbench!(id), do: Repo.get!(Workbench, id)
  def get_workbench(id), do: Repo.get(Workbench, id)
  def get_workbench_job!(id), do: Repo.get!(WorkbenchJob, id)
  def get_workbench_job(id), do: Repo.get(WorkbenchJob, id)

  def get_workbench_job_activity!(id), do: Repo.get!(WorkbenchJobActivity, id)
  def get_workbench_job_activity(id), do: Repo.get(WorkbenchJobActivity, id)

  def get_workbench_by_name(name), do: Repo.get_by(Workbench, name: name)
  def get_workbench_by_name!(name), do: Repo.get_by!(Workbench, name: name)

  def get_workbench_tool!(id), do: Repo.get!(WorkbenchTool, id)
  def get_workbench_tool(id), do: Repo.get(WorkbenchTool, id)

  def get_workbench_tool_by_name(name), do: Repo.get_by(WorkbenchTool, name: name)
  def get_workbench_tool_by_name!(name), do: Repo.get_by!(WorkbenchTool, name: name)

  def get_workbench_cron!(id), do: Repo.get!(WorkbenchCron, id)
  def get_workbench_cron(id), do: Repo.get(WorkbenchCron, id)
  def get_workbench_prompt!(id), do: Repo.get!(WorkbenchPrompt, id)
  def get_workbench_prompt(id), do: Repo.get(WorkbenchPrompt, id)
  def get_workbench_skill!(id), do: Repo.get!(WorkbenchSkill, id)
  def get_workbench_skill(id), do: Repo.get(WorkbenchSkill, id)
  def get_workbench_webhook!(id), do: Repo.get!(WorkbenchWebhook, id)
  def get_workbench_webhook(id), do: Repo.get(WorkbenchWebhook, id)

  @doc """
  Creates or updates a workbench. If attrs contain an id, that record is updated.
  Otherwise if attrs contain a name, looks up by name and updates or creates.
  """
  @spec create_workbench(map, User.t()) :: workbench_resp
  def create_workbench(attrs, %User{} = user) do
    %Workbench{}
    |> Workbench.changeset(Settings.add_project_id(attrs, user))
    |> allow(user, :write)
    |> when_ok(:insert)
    |> notify(:create, user)
  end

  @doc """
  Updates a workbench.
  """
  @spec update_workbench(map, binary, User.t()) :: workbench_resp
  def update_workbench(attrs, id, %User{} = user) do
    get_workbench!(id)
    |> Repo.preload([:tool_associations, :read_bindings, :write_bindings])
    |> allow(user, :write)
    |> when_ok(&Workbench.changeset(&1, attrs))
    |> when_ok(:update)
    |> notify(:update, user)
  end

  @doc """
  Deletes a workbench.
  """
  @spec delete_workbench(binary, User.t()) :: workbench_resp
  def delete_workbench(id, %User{} = user) do
    get_workbench!(id)
    |> allow(user, :write)
    |> when_ok(:delete)
    |> notify(:delete, user)
  end

  @doc """
  Creates a new workbench tool.
  """
  @spec create_tool(map, User.t()) :: tool_resp
  def create_tool(attrs, %User{} = user) do
    %WorkbenchTool{}
    |> WorkbenchTool.changeset(Settings.add_project_id(attrs, user))
    |> allow(user, :write)
    |> when_ok(:insert)
    |> notify(:create, user)
  end

  @doc """
  Updates an existing workbench tool.
  """
  @spec update_tool(map, binary, User.t()) :: tool_resp
  def update_tool(attrs, id, %User{} = user) do
    get_workbench_tool!(id)
    |> Repo.preload([:read_bindings, :write_bindings])
    |> allow(user, :write)
    |> when_ok(&WorkbenchTool.changeset(&1, attrs))
    |> when_ok(:update)
    |> notify(:update, user)
  end

  @doc """
  Deletes a workbench tool.
  """
  @spec delete_tool(binary, User.t()) :: tool_resp
  def delete_tool(id, %User{} = user) do
    get_workbench_tool!(id)
    |> allow(user, :write)
    |> when_ok(:delete)
    |> notify(:delete, user)
  end

  @doc """
  Creates or updates a workbench cron. If attrs contain an id for an existing cron
  on the workbench, that record is updated. Otherwise a new cron is created.
  Requires write permission on the workbench.
  """
  @spec create_workbench_cron(map, binary, User.t()) :: cron_resp
  def create_workbench_cron(attrs, workbench_id, %User{id: uid} = user) do
    %WorkbenchCron{workbench_id: workbench_id, user_id: uid}
    |> WorkbenchCron.changeset(attrs)
    |> allow(user, :write)
    |> when_ok(:insert)
    |> notify(:create, user)
  end

  @doc """
  Updates a workbench cron. Requires write permission on the workbench.
  """
  @spec update_workbench_cron(map, binary, User.t()) :: cron_resp
  def update_workbench_cron(attrs, id, %User{} = user) do
    get_workbench_cron!(id)
    |> WorkbenchCron.changeset(attrs)
    |> allow(user, :write)
    |> when_ok(:update)
    |> notify(:update, user)
  end

  @doc """
  Deletes a workbench cron. Requires write permission on the workbench.
  """
  @spec delete_workbench_cron(binary, User.t()) :: cron_resp
  def delete_workbench_cron(id, %User{} = user) do
    get_workbench_cron!(id)
    |> allow(user, :write)
    |> when_ok(:delete)
    |> notify(:delete, user)
  end

  @doc """
  Fetches a workbench cron by id. Requires read permission on the workbench.
  """
  @spec fetch_workbench_cron(binary, User.t()) :: cron_resp
  def fetch_workbench_cron(id, %User{} = user) do
    get_workbench_cron!(id)
    |> allow(user, :read)
  end

  @doc """
  Creates a saved prompt for a workbench. Requires read access to the workbench.
  """
  @spec create_workbench_prompt(map, binary, User.t()) :: prompt_resp
  def create_workbench_prompt(attrs, workbench_id, %User{} = user) do
    %WorkbenchPrompt{workbench_id: workbench_id}
    |> WorkbenchPrompt.changeset(attrs)
    |> allow(user, :read)
    |> when_ok(:insert)
    |> notify(:create, user)
  end

  @doc """
  Updates a saved workbench prompt. Requires read access to the workbench.
  """
  @spec update_workbench_prompt(map, binary, User.t()) :: prompt_resp
  def update_workbench_prompt(attrs, id, %User{} = user) do
    get_workbench_prompt!(id)
    |> WorkbenchPrompt.changeset(attrs)
    |> allow(user, :read)
    |> when_ok(:update)
    |> notify(:update, user)
  end

  @doc """
  Deletes a saved workbench prompt. Requires read access to the workbench.
  """
  @spec delete_workbench_prompt(binary, User.t()) :: prompt_resp
  def delete_workbench_prompt(id, %User{} = user) do
    get_workbench_prompt!(id)
    |> allow(user, :read)
    |> when_ok(:delete)
    |> notify(:delete, user)
  end

  @doc """
  Creates a saved workbench skill. Requires write access to the workbench.
  """
  @spec create_workbench_skill(map, binary, User.t()) :: skill_resp
  def create_workbench_skill(attrs, workbench_id, %User{} = user) do
    %WorkbenchSkill{workbench_id: workbench_id}
    |> WorkbenchSkill.changeset(attrs)
    |> allow(user, :write)
    |> when_ok(:insert)
    |> notify(:create, user)
  end

  @doc """
  Updates a saved workbench skill. Requires write access to the workbench.
  """
  @spec update_workbench_skill(map, binary, User.t()) :: skill_resp
  def update_workbench_skill(attrs, id, %User{} = user) do
    get_workbench_skill!(id)
    |> WorkbenchSkill.changeset(attrs)
    |> allow(user, :write)
    |> when_ok(:update)
    |> notify(:update, user)
  end

  @doc """
  Deletes a saved workbench skill. Requires write access to the workbench.
  """
  @spec delete_workbench_skill(binary, User.t()) :: skill_resp
  def delete_workbench_skill(id, %User{} = user) do
    get_workbench_skill!(id)
    |> allow(user, :write)
    |> when_ok(:delete)
    |> notify(:delete, user)
  end

  @doc """
  Lists all webhooks for a workbench, this view is cached.
  """
  @decorate cacheable(cache: @cache_adapter, key: {:wb_webhooks, webhook_id}, opts: [ttl: @ttl])
  def list_workbench_webhooks(webhook_id) do
    WorkbenchWebhook.for_webhook(webhook_id)
    |> Repo.all()
  end

  @decorate cacheable(cache: @cache_adapter, key: {:wb_webhooks_for_issue, issue_webhook_id}, opts: [ttl: @ttl])
  def list_workbench_webhooks_for_issue(issue_webhook_id) do
    WorkbenchWebhook.for_issue_webhook(issue_webhook_id)
    |> Repo.all()
  end

  @doc """
  Creates or updates a workbench webhook. If attrs contain an id for an existing
  webhook on the workbench, that record is updated. Otherwise if attrs contain
  workbench_id and name, looks up by name and updates or creates.
  Requires write permission on the workbench.
  """
  @spec create_workbench_webhook(map, binary, User.t()) :: webhook_resp
  def create_workbench_webhook(attrs, workbench_id, %User{} = user) do
    %WorkbenchWebhook{workbench_id: workbench_id}
    |> WorkbenchWebhook.changeset(attrs)
    |> allow(user, :write)
    |> when_ok(:insert)
    |> notify(:create, user)
  end

  @doc """
  Updates a workbench webhook. Requires write permission on the workbench.
  """
  @spec update_workbench_webhook(map, binary, User.t()) :: webhook_resp
  def update_workbench_webhook(attrs, id, %User{} = user) do
    get_workbench_webhook!(id)
    |> allow(user, :write)
    |> when_ok(&WorkbenchWebhook.changeset(&1, attrs))
    |> when_ok(:update)
    |> notify(:update, user)
  end

  @doc """
  Deletes a workbench webhook. Requires write permission on the workbench.
  """
  @spec delete_workbench_webhook(binary, User.t()) :: webhook_resp
  def delete_workbench_webhook(id, %User{} = user) do
    get_workbench_webhook!(id)
    |> allow(user, :write)
    |> when_ok(:delete)
    |> notify(:delete, user)
  end

  @doc """
  Creates a new workbench job for a workbench. Requires read access to the workbench.
  """
  @spec create_workbench_job(map, binary, User.t()) :: job_resp
  def create_workbench_job(attrs, workbench_id, %User{} = user) do
    %WorkbenchJob{user_id: user.id, workbench_id: workbench_id}
    |> WorkbenchJob.changeset(Map.put(attrs, :result, %{working_theory: "", conclusion: ""}))
    |> allow(user, :read)
    |> when_ok(:insert)
    |> notify(:create, user)
  end

  @doc """
  Updates a workbench job. Requires read access to the workbench.
  """
  @spec update_workbench_job(map, WorkbenchJob.t() | binary, User.t()) :: job_resp
  def update_workbench_job(attrs, %WorkbenchJob{} = job, %User{} = user) do
    Repo.preload(job, :result)
    |> WorkbenchJob.update_changeset(attrs)
    |> allow(user, :edit)
    |> when_ok(:update)
    |> notify(:update, user)
  end
  def update_workbench_job(attrs, id, user) when is_binary(id) do
    get_workbench_job!(id)
    |> then(&update_workbench_job(attrs, &1, user))
  end
  def update_workbench_job(_, _, _), do: {:error, "you can only update your own jobs"}

  @doc """
  Cancels a workbench job. Requires write access to the job, or for the user to be the owner of the job.
  """
  @spec cancel_workbench_job(binary, User.t()) :: job_resp
  def cancel_workbench_job(id, %User{} = user) do
    start_transaction()
    |> add_operation(:job, fn _ ->
      get_workbench_job!(id)
      |> WorkbenchJob.changeset(%{status: :cancelled})
      |> allow(user, :edit)
      |> when_ok(:update)
    end)
    |> add_operation(:heartbeat, fn %{job: job} ->
      Console.AI.Workbench.Router.stop(job)
      {:ok, job}
    end)
    |> execute(extract: :job)
    |> notify(:update, user)
  end

  @doc """
  Fails a workbench job. Requires write access to the job, or for the user to be the owner of the job.
  """
  @spec fail_job(WorkbenchJob.t()) :: job_resp
  def fail_job(%WorkbenchJob{} = job) do
    job
    |> WorkbenchJob.changeset(%{status: :failed})
    |> Repo.update()
    |> notify(:update)
  end

  @doc """
  Kicks a job by updating the updated_at timestamp to 20 minutes ago.
  """
  @spec kick_job(WorkbenchJob.t() | binary, User.t()) :: job_resp
  def kick_job(%WorkbenchJob{user_id: id} = job, %User{id: id}) do
    job
    |> Ecto.Changeset.change(%{updated_at: Timex.now() |> Timex.shift(minutes: -20)})
    |> Repo.update()
    |> notify(:update)
  end
  def kick_job(id, user) when is_binary(id) do
    get_workbench_job!(id)
    |> kick_job(user)
  end
  def kick_job(_, _), do: {:error, "you can only kick your own jobs"}

  @doc """
  Heartbeats a job by setting status to running and updating the updated_at timestamp to the current time.
  """
  @spec heartbeat(WorkbenchJob.t(), boolean) :: job_resp
  def heartbeat(%WorkbenchJob{id: id}, boot \\ false) do
    case {get_workbench_job!(id), boot} do
      {job, true} -> mark_running(job)
      {%WorkbenchJob{status: s} = job, _} when s in ~w(successful failed cancelled)a -> {:ok, job}
      {job, _} -> mark_running(job)
    end
  end

  defp mark_running(%WorkbenchJob{} = job) do
    job
    |> Ecto.Changeset.change(%{status: :running, updated_at: Timex.now()})
    |> Repo.update(allow_stale: true)
  end

  @doc """
  Creates a new message for a job. Requires read access to the job.
  """
  @spec create_message(map, binary, User.t()) :: activity_resp
  def create_message(attrs, %WorkbenchJob{} = job, %User{} = user) do
    start_transaction()
    |> add_operation(:job, fn _ ->
      allow(job, user, :edit)
      |> error("you can only create messages for your own jobs")
    end)
    |> add_operation(:idle, fn _ ->
      case WorkbenchJob.idle?(job) do
        true ->
          WorkbenchJob.changeset(job, %{status: :pending, error: nil})
          |> Repo.update()
        false -> {:error, "job is currently active, please wait for it to complete before prompting"}
      end
    end)
    |> add_operation(:activity, fn %{job: job} ->
      %WorkbenchJobActivity{workbench_job_id: job.id, type: :user, status: :successful}
      |> WorkbenchJobActivity.changeset(attrs)
      |> Repo.insert()
    end)
    |> execute(extract: :activity)
    |> notify(:create, user)
  end

  def create_message(attrs, id, %User{} = user) when is_binary(id) do
    get_workbench_job!(id)
    |> then(&create_message(attrs, &1, user))
  end

  @doc """
  Creates a new activity for a job, and bookkeeps job status and timestamp.
  """
  @spec create_job_activity(map, WorkbenchJob.t()) :: activity_resp
  def create_job_activity(attrs, %WorkbenchJob{} = job) do
    start_transaction()
    |> add_operation(:activity, fn _ ->
      %WorkbenchJobActivity{workbench_job_id: job.id}
      |> WorkbenchJobActivity.changeset(attrs)
      |> Repo.insert()
    end)
    |> add_operation(:job, fn _ ->
      Ecto.Changeset.change(job, %{status: :running, updated_at: DateTime.utc_now()})
      |> Repo.update()
    end)
    |> execute(extract: :activity)
    |> notify(:create)
  end

  @doc """
  Updates an existing activity for a job.
  """
  @spec update_job_activity(map, WorkbenchJobActivity.t()) :: activity_resp
  def update_job_activity(attrs, %WorkbenchJobActivity{} = activity) do
    activity
    |> WorkbenchJobActivity.changeset(attrs)
    |> Repo.update()
    |> notify(:update)
  end

  @doc """
  Associates an agent run with a workbench activity: inserts the join row (idempotent) and sets
  `agent_run_id` and `status: :running` on the activity.
  """
  @spec associate_agent_run(WorkbenchJobActivity.t(), binary) :: activity_resp
  def associate_agent_run(%WorkbenchJobActivity{} = activity, run_id) when is_binary(run_id) do
    start_transaction()
    |> add_operation(:association, fn _ ->
      %WorkbenchJobActivityAgentRun{}
      |> WorkbenchJobActivityAgentRun.changeset(%{
        workbench_job_activity_id: activity.id,
        agent_run_id: run_id
      })
      |> Repo.insert(on_conflict: :nothing, conflict_target: [:workbench_job_activity_id, :agent_run_id])
    end)
    |> add_operation(:activity, fn _ ->
      activity
      |> WorkbenchJobActivity.changeset(%{status: :running, agent_run_id: run_id})
      |> Repo.update()
    end)
    |> execute(extract: :activity)
    |> notify(:update)
  end

  @doc """
  Updates the status of a job, and creates a new recording the change made.
  """
  @spec update_job_status(%{status: map, prompt: binary, output: binary}, WorkbenchJob.t()) :: activity_resp
  def update_job_status(%{status: %{} = status, prompt: prompt, output: output} = args, %WorkbenchJob{} = job)
    when is_binary(prompt) and is_binary(output) do
    %{result: result} = Repo.preload(job, :result)
    start_transaction()
    |> add_operation(:result, fn _ ->
      WorkbenchJobResult.changeset(result, status)
      |> Repo.update()
    end)
    |> add_operation(:activity, fn _ ->
      status =
        TextDiff.format(result.working_theory || "", status[:working_theory] || "", color: true)
        |> IO.iodata_to_binary()
        |> then(&Map.put(status, :diff, &1))
      create_job_activity(%{
        status: :successful,
        type: :memo,
        prompt: prompt,
        result: %{output: output, job_update: status},
        tool_call: args[:tool_call]
      }, job)
    end)
    |> execute(extract: :activity)
    |> notify(:update)
  end
  def update_job_status(_, _), do: {:error, "invalid input struct for job status update"}

  @spec complete_job(map, WorkbenchJob.t()) :: job_resp
  def complete_job(attrs, %WorkbenchJob{} = job) do
    start_transaction()
    |> add_operation(:activity, fn _ ->
      create_job_activity(%{
        status: :successful,
        type: :conclusion,
        prompt: "completing job...",
        result: %{output: attrs[:conclusion] || "no conclusion provided"}
      }, job)
    end)
    |> add_operation(:job, fn _ ->
      Repo.preload(job, :result)
      |> WorkbenchJob.changeset(%{
        status: :successful,
        completed_at: DateTime.utc_now(),
        result: Console.mapify(attrs)
      })
      |> Console.Repo.update()
    end)
    |> execute(extract: :job)
    |> notify(:update)
  end

  @doc """
  Fails a job with an error message.
  """
  @spec fail_job(binary, WorkbenchJob.t()) :: job_resp
  def fail_job(error, %WorkbenchJob{} = job) when is_binary(error) do
    WorkbenchJob.changeset(job, %{
      status: :failed,
      completed_at: DateTime.utc_now(),
      error: error
    })
    |> Repo.update()
    |> notify(:update)
  end

  defp notify({:ok, %Workbench{} = workbench}, :create, user),
    do: handle_notify(PubSub.WorkbenchCreated, workbench, actor: user)
  defp notify({:ok, %Workbench{} = workbench}, :update, user),
    do: handle_notify(PubSub.WorkbenchUpdated, workbench, actor: user)
  defp notify({:ok, %Workbench{} = workbench}, :delete, user),
    do: handle_notify(PubSub.WorkbenchDeleted, workbench, actor: user)
  defp notify({:ok, %WorkbenchJob{} = job}, :create, user),
    do: handle_notify(PubSub.WorkbenchJobCreated, job, actor: user)
  defp notify({:ok, %WorkbenchTool{} = tool}, :create, user),
    do: handle_notify(PubSub.WorkbenchToolCreated, tool, actor: user)
  defp notify({:ok, %WorkbenchTool{} = tool}, :update, user),
    do: handle_notify(PubSub.WorkbenchToolUpdated, tool, actor: user)
  defp notify({:ok, %WorkbenchTool{} = tool}, :delete, user),
    do: handle_notify(PubSub.WorkbenchToolDeleted, tool, actor: user)
  defp notify({:ok, %WorkbenchCron{} = cron}, :create, user),
    do: handle_notify(PubSub.WorkbenchCronCreated, cron, actor: user)
  defp notify({:ok, %WorkbenchCron{} = cron}, :update, user),
    do: handle_notify(PubSub.WorkbenchCronUpdated, cron, actor: user)
  defp notify({:ok, %WorkbenchCron{} = cron}, :delete, user),
    do: handle_notify(PubSub.WorkbenchCronDeleted, cron, actor: user)
  defp notify({:ok, %WorkbenchPrompt{} = prompt}, :create, user),
    do: handle_notify(PubSub.WorkbenchPromptCreated, prompt, actor: user)
  defp notify({:ok, %WorkbenchPrompt{} = prompt}, :update, user),
    do: handle_notify(PubSub.WorkbenchPromptUpdated, prompt, actor: user)
  defp notify({:ok, %WorkbenchPrompt{} = prompt}, :delete, user),
    do: handle_notify(PubSub.WorkbenchPromptDeleted, prompt, actor: user)
  defp notify({:ok, %WorkbenchSkill{} = skill}, :create, user),
    do: handle_notify(PubSub.WorkbenchSkillCreated, skill, actor: user)
  defp notify({:ok, %WorkbenchSkill{} = skill}, :update, user),
    do: handle_notify(PubSub.WorkbenchSkillUpdated, skill, actor: user)
  defp notify({:ok, %WorkbenchSkill{} = skill}, :delete, user),
    do: handle_notify(PubSub.WorkbenchSkillDeleted, skill, actor: user)
  defp notify({:ok, %WorkbenchWebhook{} = webhook}, :create, user),
    do: handle_notify(PubSub.WorkbenchWebhookCreated, webhook, actor: user)
  defp notify({:ok, %WorkbenchWebhook{} = webhook}, :update, user),
    do: handle_notify(PubSub.WorkbenchWebhookUpdated, webhook, actor: user)
  defp notify({:ok, %WorkbenchWebhook{} = webhook}, :delete, user),
    do: handle_notify(PubSub.WorkbenchWebhookDeleted, webhook, actor: user)
  defp notify({:ok, %WorkbenchJobActivity{} = activity}, :create, user),
    do: handle_notify(PubSub.WorkbenchJobActivityCreated, activity, actor: user)
  defp notify(pass, _, _), do: pass

  def notify({:ok, %WorkbenchJobThought{} = thought}, :create),
    do: handle_notify(PubSub.WorkbenchJobThoughtCreated, thought)
  def notify({:ok, %WorkbenchJobActivity{} = activity}, :create),
    do: handle_notify(PubSub.WorkbenchJobActivityCreated, activity)
  def notify({:ok, %WorkbenchJobActivity{} = activity}, :update),
    do: handle_notify(PubSub.WorkbenchJobActivityUpdated, activity)
  def notify(pass, _), do: pass
end
