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

  describe "build_cluster_metrics/2" do
    test "builds health metric with correct attributes" do
      project = insert(:project, name: "prod-project")
      cluster = insert(:cluster,
        name: "prod-cluster",
        handle: "prod",
        project: project,
        distro: :eks,
        version: "1.28",
        current_version: "1.28.5",
        pinged_at: Timex.now()
      )
      cluster = Repo.preload(cluster, [:project, :upgrade_insights])

      timestamp = DateTime.utc_now()
      [health_metric | _] = MetricsBuilder.build_cluster_metrics(cluster, timestamp)

      assert health_metric.name == "plural.cluster.health"
      assert health_metric.value == 1
      assert health_metric.timestamp == timestamp
      assert health_metric.attributes.cluster_id == cluster.id
      assert health_metric.attributes.cluster_name == "prod-cluster"
      assert health_metric.attributes.cluster_handle == "prod"
      assert health_metric.attributes.project_name == "prod-project"
      assert health_metric.attributes.distro == "eks"
      assert health_metric.attributes.version == "1.28"
      assert health_metric.attributes.current_version == "1.28.5"
      assert health_metric.attributes.healthy == true
    end

    test "builds upgradeability metrics from upgrade insights" do
      cluster = insert(:cluster, pinged_at: Timex.now())
      insert(:upgrade_insight, cluster: cluster, status: :passing, version: "1.29", name: "k8s-upgrade")
      insert(:upgrade_insight, cluster: cluster, status: :failed, version: "1.30", name: "k8s-upgrade")
      cluster = Repo.preload(cluster, [:project, :upgrade_insights], force: true)

      timestamp = DateTime.utc_now()
      metrics = MetricsBuilder.build_cluster_metrics(cluster, timestamp)

      assert length(metrics) == 3

      upgrade_metrics = Enum.filter(metrics, &(&1.name == "plural.cluster.upgradeability"))
      assert length(upgrade_metrics) == 2

      passing_metric = Enum.find(upgrade_metrics, &(&1.attributes.target_version == "1.29"))
      assert passing_metric.value == 1
      assert passing_metric.attributes.status == "passing"
      assert passing_metric.attributes.insight_name == "k8s-upgrade"

      failed_metric = Enum.find(upgrade_metrics, &(&1.attributes.target_version == "1.30"))
      assert failed_metric.value == -2
      assert failed_metric.attributes.status == "failed"
    end

    test "marks unhealthy clusters correctly" do
      cluster = insert(:cluster, pinged_at: Timex.now() |> Timex.shift(hours: -1))
      cluster = Repo.preload(cluster, [:project, :upgrade_insights])

      [health_metric | _] = MetricsBuilder.build_cluster_metrics(cluster, DateTime.utc_now())

      assert health_metric.value == 0
      assert health_metric.attributes.healthy == false
    end

    test "handles clusters without projects" do
      cluster = insert(:cluster, project: nil, pinged_at: Timex.now())
      cluster = Repo.preload(cluster, [:project, :upgrade_insights])

      [health_metric | _] = MetricsBuilder.build_cluster_metrics(cluster, DateTime.utc_now())

      assert health_metric.attributes.project_id == nil
      assert health_metric.attributes.project_name == nil
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

  describe "upgrade_status_to_value/1" do
    test "maps all status values correctly" do
      assert MetricsBuilder.upgrade_status_to_value(:passing) == 1
      assert MetricsBuilder.upgrade_status_to_value(:warning) == 0
      assert MetricsBuilder.upgrade_status_to_value(:unknown) == -1
      assert MetricsBuilder.upgrade_status_to_value(:failed) == -2
      assert MetricsBuilder.upgrade_status_to_value(:other) == -1
    end
  end

  describe "cluster_health_to_value/1" do
    test "returns 1 for healthy cluster" do
      cluster = insert(:cluster, pinged_at: Timex.now())
      assert MetricsBuilder.cluster_health_to_value(cluster) == 1
    end

    test "returns 0 for unhealthy cluster" do
      cluster = insert(:cluster, pinged_at: Timex.now() |> Timex.shift(hours: -1))
      assert MetricsBuilder.cluster_health_to_value(cluster) == 0
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

  describe "cluster_metrics_stream/1" do
    test "streams metrics for all clusters" do
      project = insert(:project)
      insert(:cluster, project: project, pinged_at: Timex.now())
      insert(:cluster, project: project, pinged_at: Timex.now())

      Repo.transaction(fn ->
        metrics = MetricsBuilder.cluster_metrics_stream() |> Enum.to_list()
        health_metrics = Enum.filter(metrics, &(&1.name == "plural.cluster.health"))
        assert length(health_metrics) == 2
      end)
    end
  end
end
