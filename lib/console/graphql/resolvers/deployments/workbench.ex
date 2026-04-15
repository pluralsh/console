defmodule Console.GraphQl.Resolvers.Deployments.Workbench do
  use Console.GraphQl.Resolvers.Deployments.Base
  alias Console.Deployments.Workbenches
  alias Console.Schema.{
    Alert,
    Issue,
    Workbench,
    WorkbenchJob,
    WorkbenchJobActivity,
    WorkbenchTool,
    WorkbenchCron,
    WorkbenchPrompt,
    WorkbenchSkill,
    WorkbenchWebhook
  }

  def workbench(%{id: id}, ctx) when is_binary(id) do
    Workbenches.get_workbench!(id)
    |> allow(actor(ctx), :read)
  end
  def workbench(%{name: name}, ctx) when is_binary(name) do
    Workbenches.get_workbench_by_name!(name)
    |> allow(actor(ctx), :read)
  end
  def workbench(_, _), do: {:error, "Must specify either id or name"}

  def workbench_tool(%{id: id}, ctx) when is_binary(id) do
    Workbenches.get_workbench_tool!(id)
    |> allow(actor(ctx), :read)
  end
  def workbench_tool(%{name: name}, ctx) when is_binary(name) do
    Workbenches.get_workbench_tool_by_name!(name)
    |> allow(actor(ctx), :read)
  end
  def workbench_tool(_, _), do: {:error, "Must specify either id or name"}

  def workbench_job(%{id: id}, ctx) do
    Workbenches.get_workbench_job!(id)
    |> allow(actor(ctx), :read)
  end

  def workbench_job_activity(%{id: id}, ctx) do
    Workbenches.get_workbench_job_activity!(id)
    |> allow(actor(ctx), :read)
  end

  def list_workbench_runs(workbench, args, _) do
    WorkbenchJob.for_workbench(workbench.id)
    |> workbench_job_filters(args)
    |> WorkbenchJob.ordered()
    |> paginate(args)
  end

  def list_workbench_crons(workbench, args, _) do
    WorkbenchCron.for_workbench(workbench.id)
    |> WorkbenchCron.ordered()
    |> paginate(args)
  end

  def list_workbench_prompts(workbench, args, _) do
    WorkbenchPrompt.for_workbench(workbench.id)
    |> WorkbenchPrompt.ordered()
    |> paginate(args)
  end

  def list_workbench_skills(workbench, args, _) do
    WorkbenchSkill.for_workbench(workbench.id)
    |> WorkbenchSkill.ordered()
    |> paginate(args)
  end

  def list_workbench_webhooks(workbench, args, _) do
    WorkbenchWebhook.for_workbench(workbench.id)
    |> WorkbenchWebhook.ordered()
    |> paginate(args)
  end

  def list_workbench_job_activities(job, args, _) do
    WorkbenchJobActivity.for_workbench_job(job.id)
    |> WorkbenchJobActivity.ordered()
    |> paginate(args)
  end

  def all_workbench_alerts(args, %{context: %{current_user: user}}) do
    Alert.for_user(user)
    |> Alert.ordered()
    |> paginate(args)
  end

  def all_workbench_issues(args, %{context: %{current_user: user}}) do
    Issue.for_user(user)
    |> Issue.ordered()
    |> paginate(args)
  end

  def workbenches(args, %{context: %{current_user: user}}) do
    Workbench.ordered()
    |> Workbench.for_user(user)
    |> workbench_filters(args)
    |> maybe_search(Workbench, args)
    |> paginate(args)
  end

  def workbench_tools(args, %{context: %{current_user: user}}) do
    WorkbenchTool.ordered()
    |> WorkbenchTool.for_user(user)
    |> workbench_tool_filters(args)
    |> maybe_search(WorkbenchTool, args)
    |> paginate(args)
  end

  def whimsey_text(%WorkbenchJob{} = job, _, _), do: Workbenches.whimsey_text(job)
  def whimsey_text(%WorkbenchJobActivity{} = activity, _, _), do: Workbenches.whimsey_text(activity)

  def create_workbench(%{attributes: attrs}, %{context: %{current_user: user}}),
    do: Workbenches.create_workbench(attrs, user)

  def update_workbench(%{id: id, attributes: attrs}, %{context: %{current_user: user}}),
    do: Workbenches.update_workbench(attrs, id, user)

  def delete_workbench(%{id: id}, %{context: %{current_user: user}}),
    do: Workbenches.delete_workbench(id, user)

  def create_workbench_tool(%{attributes: attrs}, %{context: %{current_user: user}}),
    do: Workbenches.create_tool(attrs, user)

  def update_workbench_tool(%{id: id, attributes: attrs}, %{context: %{current_user: user}}),
    do: Workbenches.update_tool(attrs, id, user)

  def delete_workbench_tool(%{id: id}, %{context: %{current_user: user}}),
    do: Workbenches.delete_tool(id, user)

  def create_workbench_job(%{workbench_id: workbench_id, attributes: attrs}, %{context: %{current_user: user}}),
    do: Workbenches.create_workbench_job(attrs, workbench_id, user)

  def create_workbench_cron(%{workbench_id: workbench_id, attributes: attrs}, %{context: %{current_user: user}}),
    do: Workbenches.create_workbench_cron(attrs, workbench_id, user)

  def update_workbench_cron(%{id: id, attributes: attrs}, %{context: %{current_user: user}}),
    do: Workbenches.update_workbench_cron(attrs, id, user)

  def delete_workbench_cron(%{id: id}, %{context: %{current_user: user}}),
    do: Workbenches.delete_workbench_cron(id, user)

  def workbench_cron(%{id: id}, %{context: %{current_user: user}}),
    do: Workbenches.fetch_workbench_cron(id, user)

  def create_workbench_prompt(%{workbench_id: workbench_id, attributes: attrs}, %{context: %{current_user: user}}),
    do: Workbenches.create_workbench_prompt(attrs, workbench_id, user)

  def update_workbench_prompt(%{id: id, attributes: attrs}, %{context: %{current_user: user}}),
    do: Workbenches.update_workbench_prompt(attrs, id, user)

  def delete_workbench_prompt(%{id: id}, %{context: %{current_user: user}}),
    do: Workbenches.delete_workbench_prompt(id, user)

  def create_workbench_skill(%{workbench_id: workbench_id, attributes: attrs}, %{context: %{current_user: user}}),
    do: Workbenches.create_workbench_skill(attrs, workbench_id, user)

  def update_workbench_skill(%{id: id, attributes: attrs}, %{context: %{current_user: user}}),
    do: Workbenches.update_workbench_skill(attrs, id, user)

  def delete_workbench_skill(%{id: id}, %{context: %{current_user: user}}),
    do: Workbenches.delete_workbench_skill(id, user)

  def create_workbench_webhook(%{workbench_id: workbench_id, attributes: attrs}, %{context: %{current_user: user}}),
    do: Workbenches.create_workbench_webhook(attrs, workbench_id, user)

  def get_workbench_webhook(%{id: id}, %{context: %{current_user: user}}) do
    Workbenches.get_workbench_webhook!(id)
    |> allow(user, :read)
  end

  def update_workbench_webhook(%{id: id, attributes: attrs}, %{context: %{current_user: user}}),
    do: Workbenches.update_workbench_webhook(attrs, id, user)

  def delete_workbench_webhook(%{id: id}, %{context: %{current_user: user}}),
    do: Workbenches.delete_workbench_webhook(id, user)

  def create_workbench_message(%{job_id: job_id, attributes: attrs}, %{context: %{current_user: user}}),
    do: Workbenches.create_message(attrs, job_id, user)

  def update_workbench_job(%{job_id: id, attributes: attributes}, %{context: %{current_user: user}}),
    do: Workbenches.update_workbench_job(attributes, id, user)

  def cancel_workbench_job(%{job_id: id}, %{context: %{current_user: user}}),
    do: Workbenches.cancel_workbench_job(id, user)

  defp workbench_filters(query, args) do
    Enum.reduce(args, query, fn
      {:project_id, project_id}, q when is_binary(project_id) -> Workbench.for_project(q, project_id)
      _, q -> q
    end)
  end

  defp workbench_tool_filters(query, args) do
    Enum.reduce(args, query, fn
      {:project_id, project_id}, q when is_binary(project_id) -> WorkbenchTool.for_project(q, project_id)
      _, q -> q
    end)
  end

  defp workbench_job_filters(query, args) do
    Enum.reduce(args, query, fn
      {:alert, true}, q -> WorkbenchJob.with_alert(q)
      {:issue, true}, q -> WorkbenchJob.with_issue(q)
      _, q -> q
    end)
  end
end
