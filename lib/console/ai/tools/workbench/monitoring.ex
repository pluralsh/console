defmodule Console.AI.Tools.Workbench.Monitoring do
  alias Console.Deployments.Observability
  alias Console.Repo
  alias Console.Schema.{Dashboard, Monitor, User, WorkbenchJob, WorkbenchJobAssociation}
  import Console.GraphQl.Resolvers.Deployments.Base, only: [maybe_search: 3]
  alias Console.AI.Tools.Workbench.Monitoring.{
    DashboardDelete,
    DashboardGraphDelete,
    DashboardGet,
    DashboardList,
    DashboardUpsert,
    MonitorDelete,
    MonitorGet,
    MonitorList,
    MonitorUpsert
  }

  @dashboard_fields ~w(id name description graphs inputs workbench_id inserted_at updated_at)a
  @monitor_fields ~w(
    id name description alert_template severity state type evaluation_cron next_run_at
    last_run_at prompt modes query threshold workbench_id service_id user_id inserted_at updated_at
  )a
  def read_tools(%WorkbenchJob{} = job) do
    [
      %DashboardList{job: job},
      %DashboardGet{job: job},
      %MonitorList{job: job},
      %MonitorGet{job: job}
    ]
  end

  def write_tools(%WorkbenchJob{} = job, %User{} = user) do
    [
      %DashboardUpsert{job: job, user: user},
      %DashboardGraphDelete{job: job, user: user},
      %DashboardDelete{job: job, user: user},
      %MonitorUpsert{job: job, user: user},
      %MonitorDelete{job: job, user: user}
    ]
  end

  def list_dashboards(%WorkbenchJob{workbench_id: workbench_id}, q, limit, offset) do
    Dashboard.for_workbench(workbench_id)
    |> Dashboard.ordered()
    |> maybe_search(Dashboard, %{q: q})
    |> Repo.paginate(limit: limit, offset: offset)
    |> Enum.map(&Map.take(&1, ~w(id name description workbench_id inserted_at updated_at)a))
    |> Console.mapify()
    |> Jason.encode()
  end

  def get_dashboard(%WorkbenchJob{} = job, id) do
    with {:ok, dashboard} <- dashboard(job, id) do
      dashboard
      |> Map.take(@dashboard_fields)
      |> Console.mapify()
      |> Jason.encode()
    end
  end

  def upsert_dashboard(
        %WorkbenchJob{} = job,
        %User{} = user,
        name,
        %Dashboard.Graph{} = graph,
        settings
      ) do
    case dashboard_by_name(job, name) do
      %Dashboard{} = dashboard ->
        dashboard
        |> dashboard_attrs()
        |> apply_dashboard_settings(settings)
        |> Map.put(:graphs, upsert_graph(dashboard.graphs, graph))
        |> Observability.update_dashboard(dashboard.id, user)

      nil ->
        settings
        |> new_dashboard_attrs(name)
        |> Map.put(:graphs, [Console.mapify(graph)])
        |> Map.put(:workbench_id, job.workbench_id)
        |> Observability.create_dashboard(user)
    end
    |> associate_and_take(job, @dashboard_fields)
  end

  def delete_dashboard_graph(%WorkbenchJob{} = job, %User{} = user, name, identifier) do
    with %Dashboard{} = dashboard <- dashboard_by_name(job, name),
         {:ok, graphs} <- delete_graph(dashboard.graphs, identifier) do
      Observability.update_dashboard(%{graphs: graphs}, dashboard.id, user)
      |> associate_and_take(job, @dashboard_fields)
    else
      nil -> {:error, "dashboard not found in this workbench"}
      error -> error
    end
  end

  def delete_dashboard(%WorkbenchJob{} = job, %User{} = user, name) do
    with %Dashboard{} = dashboard <- dashboard_by_name(job, name),
         {:ok, _} <- Observability.delete_dashboard(dashboard.id, user) do
      {:ok, "Deleted dashboard #{dashboard.name}"}
    else
      nil -> {:error, "dashboard not found in this workbench"}
      error -> error
    end
  end

  def list_monitors(%WorkbenchJob{workbench_id: workbench_id}, q, limit, offset) do
    Monitor.for_workbench(workbench_id)
    |> Monitor.ordered()
    |> maybe_search(Monitor, %{q: q})
    |> Repo.paginate(limit: limit, offset: offset)
    |> Enum.map(&Map.take(&1, ~w(id name description severity state type service_id workbench_id)a))
    |> Console.mapify()
    |> Jason.encode()
  end

  def get_monitor(%WorkbenchJob{} = job, id) do
    with {:ok, monitor} <- monitor(job, id) do
      monitor
      |> Map.take(@monitor_fields)
      |> Console.mapify()
      |> Jason.encode()
    end
  end

  def upsert_monitor(
        %WorkbenchJob{} = job,
        %User{} = user,
        id,
        %MonitorUpsert.Attributes{} = attrs
      ) do
    attrs =
      attrs
      |> Console.mapify()
      |> Map.put(:workbench_id, job.workbench_id)


    case id do
      id when is_binary(id) and byte_size(id) > 0 ->
        with {:ok, _} <- monitor(job, id), do: Observability.update_monitor(attrs, id, user)

      _ ->
        Observability.create_monitor(attrs, user)
    end
    |> associate_and_take(job, @monitor_fields)
  end

  def delete_monitor(%WorkbenchJob{} = job, %User{} = user, id) do
    with {:ok, monitor} <- monitor(job, id),
         {:ok, _} <- Observability.delete_monitor(monitor.id, user) do
      {:ok, "Deleted monitor #{monitor.name} (#{monitor.id})"}
    end
  end

  defp dashboard(%WorkbenchJob{workbench_id: workbench_id}, id) do
    case Repo.get_by(Dashboard, id: id, workbench_id: workbench_id) do
      %Dashboard{} = dashboard -> {:ok, dashboard}
      nil -> {:error, "dashboard not found in this workbench"}
    end
  end

  defp dashboard_by_name(%WorkbenchJob{workbench_id: workbench_id}, name),
    do: Repo.get_by(Dashboard, name: name, workbench_id: workbench_id)

  defp dashboard_attrs(%Dashboard{} = dashboard) do
    dashboard
    |> Map.take(~w(name description inputs)a)
    |> Console.mapify()
  end

  defp new_dashboard_attrs(nil, name), do: %{name: name}

  defp new_dashboard_attrs(%DashboardUpsert.Settings{} = settings, name) do
    %{name: name}
    |> apply_dashboard_settings(settings)
  end

  defp apply_dashboard_settings(attrs, nil), do: attrs

  defp apply_dashboard_settings(attrs, %DashboardUpsert.Settings{} = settings) do
    attrs
    |> maybe_put(:name, settings.name)
    |> maybe_put(:description, settings.description)
    |> maybe_put_inputs(settings.inputs)
  end

  defp maybe_put(attrs, _, nil), do: attrs
  defp maybe_put(attrs, key, value), do: Map.put(attrs, key, value)

  defp maybe_put_inputs(attrs, []), do: attrs
  defp maybe_put_inputs(attrs, inputs), do: Map.put(attrs, :inputs, Console.mapify(inputs))

  defp upsert_graph(graphs, %Dashboard.Graph{identifier: identifier} = graph) do
    graph = Console.mapify(graph)

    Enum.reduce(graphs, {[], false}, fn
      %Dashboard.Graph{identifier: ^identifier}, {updated, _} -> {[graph | updated], true}
      g, {updated, found} -> {[Console.mapify(g) | updated], found}
    end)
    |> case do
      {updated, true} -> Enum.reverse(updated)
      {updated, _} -> Enum.reverse([graph | updated])
    end
  end

  defp delete_graph(graphs, identifier) do
    case Enum.split_with(graphs, &(&1.identifier == identifier)) do
      {[], _} -> {:error, "graph #{identifier} not found"}
      {_, remaining} -> {:ok, Enum.map(remaining, &Console.mapify/1)}
    end
  end

  defp monitor(%WorkbenchJob{workbench_id: workbench_id}, id) do
    case Repo.get_by(Monitor, id: id, workbench_id: workbench_id) do
      %Monitor{} = monitor -> {:ok, monitor}
      nil -> {:error, "monitor not found in this workbench"}
    end
  end

  defp associate_and_take({:ok, resource}, job, fields) do
    with {:ok, resource} <- associate(job, resource) do
      resource
      |> Map.take(fields)
      |> Console.mapify()
      |> Jason.encode()
    end
  end

  defp associate_and_take(pass, _, _), do: pass

  defp associate(%WorkbenchJob{id: job_id}, %{id: resource_id} = resource) do
    attrs =
      %{workbench_job_id: job_id}
      |> Map.put(association_field(resource), resource_id)

    %WorkbenchJobAssociation{}
    |> WorkbenchJobAssociation.changeset(attrs)
    |> Repo.insert(on_conflict: :nothing)
    |> case do
      {:ok, _} -> {:ok, resource}
      {:error, error} -> {:error, error}
    end
  end

  defp association_field(%Dashboard{}), do: :dashboard_id
  defp association_field(%Monitor{}), do: :monitor_id
end
