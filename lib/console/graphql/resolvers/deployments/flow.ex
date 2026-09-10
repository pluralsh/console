defmodule Console.GraphQl.Resolvers.Deployments.Flow do
  use Console.GraphQl.Resolvers.Deployments.Base
  import Absinthe.Resolution.Helpers, only: [batch: 3]
  import Ecto.Query
  alias Console.Repo
  alias Console.Deployments.{Flows, Policies}
  alias Console.Schema.{
    Flow,
    Service,
    ServiceComponent,
    AiInsight,
    Pipeline,
    McpServer,
    PullRequest,
    McpServerAudit,
    Alert,
    PreviewEnvironmentTemplate,
    PreviewEnvironmentInstance,
    VulnerabilityReport,
    Issue
  }

  def list_flows(args, %{context: %{current_user: user}}) do
    Flow.for_user(user)
    |> maybe_search(Flow, args)
    |> flow_status_filter(args)
    |> visible_flow_query()
    |> flow_order(args)
    |> paginate(args)
  end

  defp flow_status_filter(query, %{statuses: statuses}) when is_list(statuses),
    do: Flow.with_service_statuses(query, statuses)
  defp flow_status_filter(query, _), do: query

  defp visible_flow_query(query) do
    from(f in Flow, where: f.id in subquery(from(v in query, select: v.id)))
  end

  defp flow_order(query, args) do
    dir = Map.get(args, :direction) || :asc
    apply_flow_sort(query, Map.get(args, :sort), dir, args)
  end

  defp apply_flow_sort(query, :service_count, dir, _),
    do: Flow.ordered_by_service_count(query, dir)
  defp apply_flow_sort(query, :favorited, dir, args),
    do: Flow.ordered_by_favorites(query, Map.get(args, :favorite_ids) || [], dir)
  defp apply_flow_sort(query, _, dir, _),
    do: Flow.ordered(query, [{dir, :name}])

  def flow_service_counts(args, %{context: %{current_user: user}}) do
    flow_ids =
      Flow.for_user(user)
      |> maybe_search(Flow, args)
      |> select([f], f.id)

    Service
    |> where([s], s.flow_id in subquery(flow_ids))
    |> Service.statuses()
    |> Repo.all()
    |> ok()
  end

  def flow_service_count(%Flow{id: id}, _, _), do: summary_field(id, :service_count)
  def flow_component_count(%Flow{id: id}, _, _), do: summary_field(id, :component_count)
  def flow_alert_count(%Flow{id: id}, _, _), do: summary_field(id, :alert_count)
  def flow_pipeline_count(%Flow{id: id}, _, _), do: summary_field(id, :pipeline_count)
  def flow_pending_pipeline_count(%Flow{id: id}, _, _), do: summary_field(id, :pending_pipeline_count)
  def flow_service_statuses(%Flow{id: id}, _, _), do: summary_field(id, :service_statuses)
  def flow_component_statuses(%Flow{id: id}, _, _), do: summary_field(id, :component_statuses)
  def flow_insight(%Flow{id: id}, _, _), do: summary_field(id, :insight)

  defp summary_field(id, key) do
    batch({__MODULE__, :flow_summaries}, id, fn summaries ->
      {:ok, Map.get(summaries, id, empty_summary()) |> Map.get(key)}
    end)
  end

  def flow_summaries(_, ids) do
    ids = Enum.uniq(ids)
    base = Map.new(ids, &{&1, empty_summary()})

    base
    |> put_status_groups(service_status_rows(ids), :service_statuses, :service_count)
    |> put_status_groups(component_status_rows(ids), :component_statuses, :component_count)
    |> put_counts(alert_rows(ids), :alert_count)
    |> put_counts(pipeline_rows(ids), :pipeline_count)
    |> put_counts(pending_pipeline_rows(ids), :pending_pipeline_count)
    |> put_insights(ids)
  end

  defp empty_summary do
    %{
      service_count: 0,
      component_count: 0,
      alert_count: 0,
      pipeline_count: 0,
      pending_pipeline_count: 0,
      service_statuses: [],
      component_statuses: [],
      insight: nil
    }
  end

  defp put_status_groups(map, rows, list_key, count_key) do
    Enum.reduce(rows, map, fn {id, entry}, acc ->
      Map.update(acc, id, empty_summary(), fn summary ->
        summary
        |> Map.update!(list_key, &[entry | &1])
        |> Map.update!(count_key, &(&1 + entry.count))
      end)
    end)
  end

  defp put_counts(map, rows, key) do
    Enum.reduce(rows, map, fn {id, count}, acc ->
      Map.update(acc, id, empty_summary(), &Map.put(&1, key, count))
    end)
  end

  defp service_status_rows(ids) do
    from(s in Service,
      where: s.flow_id in ^ids,
      group_by: [s.flow_id, s.status],
      select: {s.flow_id, %{status: s.status, count: count(s.id)}}
    )
    |> Repo.all()
  end

  defp component_status_rows(ids) do
    from(sc in ServiceComponent,
      join: s in assoc(sc, :service),
      where: s.flow_id in ^ids,
      group_by: [s.flow_id, sc.state],
      select: {s.flow_id, %{state: sc.state, count: count(sc.id)}}
    )
    |> Repo.all()
  end

  defp alert_rows(ids) do
    from(a in Alert,
      join: s in assoc(a, :service),
      where: s.flow_id in ^ids,
      group_by: s.flow_id,
      select: {s.flow_id, count(a.id)}
    )
    |> Repo.all()
  end

  defp pipeline_rows(ids) do
    from(p in Pipeline,
      where: p.flow_id in ^ids,
      group_by: p.flow_id,
      select: {p.flow_id, count(p.id)}
    )
    |> Repo.all()
  end

  defp put_insights(map, ids) do
    latest = latest_insight_ids(ids)
    insights = insights_by_id(Enum.map(latest, &elem(&1, 1)))

    Enum.reduce(latest, map, fn {flow_id, insight_id}, acc ->
      Map.update(acc, flow_id, empty_summary(), &Map.put(&1, :insight, Map.get(insights, insight_id)))
    end)
  end

  defp latest_insight_ids(ids) do
    (service_insight_rows(ids) ++ component_insight_rows(ids))
    |> Enum.group_by(&elem(&1, 0))
    |> Enum.map(fn {flow_id, rows} ->
      {_, insight_id, _} = Enum.max_by(rows, fn {_, _, ts} -> ts end)
      {flow_id, insight_id}
    end)
  end

  defp insights_by_id([]), do: %{}
  defp insights_by_id(ids) do
    from(i in AiInsight, where: i.id in ^ids)
    |> Repo.all()
    |> Map.new(& {&1.id, &1})
  end

  defp service_insight_rows(ids) do
    from(s in Service,
      join: i in AiInsight, on: i.id == s.insight_id,
      where: s.flow_id in ^ids and not is_nil(i.summary),
      select: {s.flow_id, i.id, coalesce(i.updated_at, i.inserted_at)}
    )
    |> Repo.all()
  end

  defp component_insight_rows(ids) do
    from(sc in ServiceComponent,
      join: s in assoc(sc, :service),
      join: i in AiInsight, on: i.id == sc.insight_id,
      where: s.flow_id in ^ids and not is_nil(i.summary),
      select: {s.flow_id, i.id, coalesce(i.updated_at, i.inserted_at)}
    )
    |> Repo.all()
  end

  defp pending_pipeline_rows(ids) do
    from(p in Pipeline,
      join: e in assoc(p, :edges),
      join: g in assoc(e, :gates),
      where: p.flow_id in ^ids and g.state == :pending,
      group_by: p.flow_id,
      select: {p.flow_id, count(g.id)}
    )
    |> Repo.all()
  end

  def list_mcp_servers(args, %{context: %{current_user: user}}) do
    McpServer.ordered()
    |> McpServer.for_user(user)
    |> maybe_search(McpServer, args)
    |> paginate(args)
  end

  def services_for_flow(%{id: id}, args, _) do
    Service.for_flow(id)
    |> Service.ordered()
    |> paginate(args)
  end

  def pipelines_for_flow(%{id: id}, args, _) do
    Pipeline.for_flow(id)
    |> Pipeline.ordered()
    |> paginate(args)
  end

  def prs_for_flow(%{id: id}, args, _) do
    PullRequest.for_flow(id)
    |> PullRequest.ordered()
    |> paginate(args)
  end

  def alerts_for_flow(%{id: id}, args, _) do
    Alert.for_flow(id)
    |> Alert.ordered()
    |> paginate(args)
  end

  def list_audits_for_flow(flow, args, _) do
    McpServerAudit.for_server(flow.id)
    |> McpServerAudit.ordered()
    |> paginate(args)
  end

  def list_preview_environment_templates(flow, args, _) do
    PreviewEnvironmentTemplate.for_flow(flow.id)
    |> PreviewEnvironmentTemplate.ordered()
    |> paginate(args)
  end

  def list_preview_environment_instances(flow, args, _) do
    PreviewEnvironmentInstance.for_flow(flow.id)
    |> PreviewEnvironmentInstance.ordered()
    |> paginate(args)
  end

  def list_vulnerability_reports_for_flow(flow, args, _) do
    VulnerabilityReport.for_flow(flow.id)
    |> VulnerabilityReport.ordered()
    |> paginate(args)
  end

  def issues_for_flow(%{id: id}, args, _) do
    Issue.for_flow(id)
    |> issue_filters(args)
    |> Issue.ordered()
    |> paginate(args)
  end

  defp issue_filters(query, args) do
    Enum.reduce(args, query, fn
      {:status, s}, q when not is_nil(s) -> Issue.for_status(q, s)
      _, q -> q
    end)
  end

  def resolve_flow(%{id: id}, %{context: %{current_user: user}}) when is_binary(id),
    do: Flows.accessible(id, user)

  def resolve_flow(%{name: name}, %{context: %{current_user: user}}) when is_binary(name),
    do: Flows.accessible_by_name(name, user)

  def resolve_flow(_, _), do: {:error, "must specify either id or name"}

  def resolve_preview_environment_template(%{id: id}, %{context: %{current_user: user}})
    when is_binary(id) do
    Flows.get_preview_environment_template(id)
    |> Policies.allow(user, :read)
  end
  def resolve_preview_environment_template(%{flow_id: id, name: name}, %{context: %{current_user: user}})
    when is_binary(id) and is_binary(name) do
    Flows.get_preview_environment_template_for_flow(id, name)
    |> Policies.allow(user, :read)
  end
  def resolve_preview_environment_template(_, _), do: {:error, "must specify either id or flowId and name"}

  def upsert_flow(%{attributes: attrs}, %{context: %{current_user: user}}),
    do: Flows.upsert_flow(attrs, user)

  def delete_flow(%{id: id}, %{context: %{current_user: user}}),
    do: Flows.delete_flow(id, user)

  def resolve_mcp_server(%{id: id}, %{context: %{current_user: user}}),
    do: Flows.server_accessible(id, user)

  def upsert_mcp_server(%{attributes: attrs}, %{context: %{current_user: user}}),
    do: Flows.upsert_mcp_server(attrs, user)

  def delete_mcp_server(%{id: id}, %{context: %{current_user: user}}),
    do: Flows.delete_mcp_server(id, user)

  def upsert_preview_environment_template(%{attributes: attrs}, %{context: %{current_user: user}}),
    do: Flows.upsert_preview_environment_template(attrs, user)

  def delete_preview_environment_template(%{id: id}, %{context: %{current_user: user}}),
    do: Flows.delete_preview_environment_template(id, user)
end
