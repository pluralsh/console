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
    WorkbenchWebhook,
  }
  alias Console.Deployments.Settings
  alias Console.PubSub

  @type error :: Console.error
  @type workbench_resp :: {:ok, Workbench.t()} | error
  @type tool_resp :: {:ok, WorkbenchTool.t()} | error
  @type job_resp :: {:ok, WorkbenchJob.t()} | error
  @type activity_resp :: {:ok, WorkbenchJobActivity.t()} | error
  @type cron_resp :: {:ok, WorkbenchCron.t()} | error
  @type webhook_resp :: {:ok, WorkbenchWebhook.t()} | error

  @cache_adapter Console.conf(:cache_adapter)
  @ttl :timer.hours(6)

  def get_workbench!(id), do: Repo.get!(Workbench, id)
  def get_workbench(id), do: Repo.get(Workbench, id)
  def get_workbench_job!(id), do: Repo.get!(WorkbenchJob, id)
  def get_workbench_job(id), do: Repo.get(WorkbenchJob, id)

  def get_workbench_by_name(name), do: Repo.get_by(Workbench, name: name)
  def get_workbench_by_name!(name), do: Repo.get_by!(Workbench, name: name)

  def get_workbench_tool!(id), do: Repo.get!(WorkbenchTool, id)
  def get_workbench_tool(id), do: Repo.get(WorkbenchTool, id)

  def get_workbench_tool_by_name(name), do: Repo.get_by(WorkbenchTool, name: name)
  def get_workbench_tool_by_name!(name), do: Repo.get_by!(WorkbenchTool, name: name)

  def get_workbench_cron!(id), do: Repo.get!(WorkbenchCron, id)
  def get_workbench_cron(id), do: Repo.get(WorkbenchCron, id)
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
  def create_workbench_cron(attrs, workbench_id, %User{} = user) do
    %WorkbenchCron{workbench_id: workbench_id}
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
    |> allow(user, :write)
    |> when_ok(&WorkbenchCron.changeset(&1, attrs))
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
  Creates a new message for a job. Requires read access to the job.
  """
  @spec create_message(map, binary, User.t()) :: activity_resp
  def create_message(attrs, %WorkbenchJob{user_id: id} = job, %User{id: id} = user) do
    start_transaction()
    |> add_operation(:job, fn _ ->
      case WorkbenchJob.idle?(job) do
        true -> {:ok, job}
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
  def create_message(_, _, _), do: {:error, "you can only create messages for your own jobs"}

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
  Updates an existing activity for a job, and bookkeeps job status and timestamp.
  """
  @spec update_job_activity(map, WorkbenchJobActivity.t()) :: activity_resp
  def update_job_activity(attrs, %WorkbenchJobActivity{} = activity) do
    %{workbench_job: job} = Repo.preload(activity, :workbench_job)
    start_transaction()
    |> add_operation(:activity, fn _ ->
      WorkbenchJobActivity.changeset(activity, attrs)
      |> Repo.update()
    end)
    |> add_operation(:job, fn _ ->
      Ecto.Changeset.change(job, %{status: :running, updated_at: DateTime.utc_now()})
      |> Repo.update()
    end)
    |> execute(extract: :activity)
    |> notify(:update)
  end

  @doc """
  Updates the status of a job, and creates a new recording the change made.
  """
  @spec update_job_status(%{status: map, prompt: binary, output: binary}, WorkbenchJob.t()) :: activity_resp
  def update_job_status(%{status: %{} = status, prompt: prompt, output: output}, %WorkbenchJob{} = job)
    when is_binary(prompt) and is_binary(output) do
    %{result: result} = Repo.preload(job, :result)
    start_transaction()
    |> add_operation(:result, fn _ ->
      WorkbenchJobResult.changeset(result, status)
      |> Repo.update()
    end)
    |> add_operation(:activity, fn _ ->
      create_job_activity(%{
        status: :successful,
        type: :memo,
        prompt: prompt,
        result: %{
          output: output,
          job_update: %{
            diff: TextDiff.format(result.working_theory || "", status[:working_theory] || "", color: true)
                  |> IO.iodata_to_binary(),
            working_theory: status[:working_theory]
          }
        }
      }, job)
    end)
    |> execute(extract: :activity)
    |> notify(:update)
  end
  def update_job_status(_, _), do: {:error, "invalid input struct for job status update"}

  @spec complete_job(map, WorkbenchJob.t()) :: job_resp
  def complete_job(attrs, %WorkbenchJob{} = job) do
    Repo.preload(job, :result)
    |> WorkbenchJob.changeset(%{
      status: :successful,
      completed_at: DateTime.utc_now(),
      result: Console.mapify(attrs)
    })
    |> Repo.update()
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
  defp notify({:ok, %WorkbenchWebhook{} = webhook}, :create, user),
    do: handle_notify(PubSub.WorkbenchWebhookCreated, webhook, actor: user)
  defp notify({:ok, %WorkbenchWebhook{} = webhook}, :update, user),
    do: handle_notify(PubSub.WorkbenchWebhookUpdated, webhook, actor: user)
  defp notify({:ok, %WorkbenchWebhook{} = webhook}, :delete, user),
    do: handle_notify(PubSub.WorkbenchWebhookDeleted, webhook, actor: user)
  defp notify({:ok, %WorkbenchJobActivity{} = activity}, :create, user),
    do: handle_notify(PubSub.WorkbenchJobActivityCreated, activity, actor: user)
  defp notify(pass, _, _), do: pass

  defp notify({:ok, %WorkbenchJobActivity{} = activity}, :create),
    do: handle_notify(PubSub.WorkbenchJobActivityCreated, activity)
  defp notify({:ok, %WorkbenchJobActivity{} = activity}, :update),
    do: handle_notify(PubSub.WorkbenchJobActivityUpdated, activity)
  defp notify(pass, _), do: pass
end
