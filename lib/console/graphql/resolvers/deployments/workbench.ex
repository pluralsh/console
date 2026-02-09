defmodule Console.GraphQl.Resolvers.Deployments.Workbench do
  use Console.GraphQl.Resolvers.Deployments.Base
  alias Console.Deployments.Workbenches
  alias Console.Schema.{Workbench, WorkbenchJob, WorkbenchJobActivity, WorkbenchTool}

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

  def list_workbench_runs(workbench, args, _) do
    WorkbenchJob.for_workbench(workbench.id)
    |> WorkbenchJob.ordered()
    |> paginate(args)
  end

  def list_workbench_job_activities(job, args, _) do
    WorkbenchJobActivity.for_workbench_job(job.id)
    |> WorkbenchJobActivity.ordered()
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
end
