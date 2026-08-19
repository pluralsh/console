defmodule Console.Otel.MetricsBuilderTest do
  use Console.DataCase, async: true
  alias Console.Otel.MetricsBuilder

  describe "build_service_metric/2" do
    test "builds metric with all attributes when service has full data" do
      project = insert(:project, name: "test-project")
      cluster = insert(:cluster, name: "test-cluster", handle: "test-handle", project: project)
      service = insert(:service,
        cluster: cluster,
        name: "api-gateway",
        namespace: "apps",
        status: :healthy,
        git: %{ref: "main", folder: "charts/api"},
        helm: %{chart: "api-gateway", version: "1.2.3"}
      )

      service = Repo.preload(service, cluster: :project)
      timestamp = DateTime.utc_now()

      metric = MetricsBuilder.build_service_metric(service, timestamp)

      assert metric.name == "plural.service.health"
      assert metric.value == 2
      assert metric.timestamp == timestamp
      assert metric.attributes.service_id == service.id
      assert metric.attributes.service_name == "api-gateway"
      assert metric.attributes.namespace == "apps"
      assert metric.attributes.cluster_id == cluster.id
      assert metric.attributes.cluster_name == "test-cluster"
      assert metric.attributes.cluster_handle == "test-handle"
      assert metric.attributes.project_id == project.id
      assert metric.attributes.project_name == "test-project"
      assert metric.attributes.git_ref == "main"
      assert metric.attributes.git_folder == "charts/api"
      assert metric.attributes.helm_chart == "api-gateway"
      assert metric.attributes.helm_version == "1.2.3"
      assert metric.attributes.status == "healthy"
    end

    test "handles services without git/helm gracefully" do
      cluster = insert(:cluster)
      service = insert(:service, cluster: cluster, status: :stale, git: nil, helm: nil)
      service = Repo.preload(service, cluster: :project)

      metric = MetricsBuilder.build_service_metric(service, DateTime.utc_now())

      assert metric.value == 0
      assert metric.attributes.git_ref == nil
      assert metric.attributes.git_folder == nil
      assert metric.attributes.helm_chart == nil
      assert metric.attributes.helm_version == nil
    end
  end

  describe "service_status_to_value/1" do
    test "maps all status values correctly" do
      assert MetricsBuilder.service_status_to_value(:healthy) == 2
      assert MetricsBuilder.service_status_to_value(:synced) == 1
      assert MetricsBuilder.service_status_to_value(:stale) == 0
      assert MetricsBuilder.service_status_to_value(:failed) == -1
      assert MetricsBuilder.service_status_to_value(:paused) == -2
      assert MetricsBuilder.service_status_to_value(:unknown) == 0
    end
  end

  describe "service_metrics_stream/1" do
    test "streams metrics for all services" do
      project = insert(:project)
      cluster = insert(:cluster, project: project, pinged_at: Timex.now())
      insert(:service, cluster: cluster, status: :healthy)
      insert(:service, cluster: cluster, status: :failed)

      Repo.transaction(fn ->
        metrics = MetricsBuilder.service_metrics_stream() |> Enum.to_list()
        assert length(metrics) == 2
        assert Enum.all?(metrics, &(&1.name == "plural.service.health"))
      end)
    end
  end

  describe "cluster_health_metrics/1" do
    test "returns aggregate health counts without cluster attributes" do
      project = insert(:project)
      insert(:cluster, project: project, pinged_at: Timex.now())
      insert(:cluster, project: project, pinged_at: Timex.now() |> Timex.shift(hours: -1))
      timestamp = DateTime.utc_now()

      Repo.transaction(fn ->
        metrics = MetricsBuilder.cluster_health_metrics(timestamp)

        assert metrics == [
                 %{
                   name: "plural.cluster.health.total",
                   value: 2,
                   timestamp: timestamp,
                   attributes: %{}
                 },
                 %{
                   name: "plural.cluster.health.healthy",
                   value: 1,
                   timestamp: timestamp,
                   attributes: %{}
                 },
                 %{
                   name: "plural.cluster.health.unhealthy",
                   value: 1,
                   timestamp: timestamp,
                   attributes: %{}
                 }
               ]
      end)
    end
  end
end
