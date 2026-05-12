defmodule Console.Otel.MetricsExporterTest do
  use Console.DataCase, async: false
  use Mimic
  alias Console.Otel.MetricsExporter

  setup :set_mimic_global

  defp stub_and_collect_metrics do
    test_pid = self()

    stub(Req, :post, fn url, opts ->
      assert url == "https://otel.example.com/v1/metrics"
      [resource_metric] = opts[:json]["resourceMetrics"]
      [scope_metric] = resource_metric["scopeMetrics"]
      metrics = scope_metric["metrics"]
      send(test_pid, {:metrics_chunk, metrics})
      {:ok, %Req.Response{status: 200, body: ""}}
    end)
  end

  defp run_export do
    {:ok, pid} = GenServer.start_link(MetricsExporter, :ok)
    send(pid, :export)
    :timer.sleep(100)
    GenServer.stop(pid)
  end

  defp collect_all_metrics(acc \\ []) do
    receive do
      {:metrics_chunk, metrics} -> collect_all_metrics(acc ++ metrics)
    after
      0 -> acc
    end
  end

  describe "export via GenServer message" do
    test "exports service and cluster metrics when enabled" do
      project = insert(:project)
      cluster = insert(:cluster, project: project, pinged_at: Timex.now())
      insert(:service, cluster: cluster, status: :healthy, namespace: "apps", name: "api")

      deployment_settings(metrics: %{
        enabled: true,
        endpoint: "https://otel.example.com",
        crontab: "*/5 * * * *"
      })

      stub_and_collect_metrics()
      run_export()
      metrics = collect_all_metrics()

      assert Enum.any?(metrics, &(&1["name"] == "plural.service.health"))
      assert Enum.any?(metrics, &(&1["name"] == "plural.cluster.health"))
    end

    test "does nothing when metrics export is disabled" do
      insert(:cluster)
      insert(:service)

      deployment_settings(metrics: %{enabled: false})

      reject(&Req.post/2)
      run_export()
    end

    test "does nothing when metrics settings are not configured" do
      insert(:cluster)
      insert(:service)

      deployment_settings()

      reject(&Req.post/2)
      run_export()
    end

    test "exports metrics in chunks" do
      project = insert(:project)
      cluster = insert(:cluster, project: project, pinged_at: Timex.now())

      for _ <- 1..5 do
        insert(:service, cluster: cluster, status: :healthy)
      end

      deployment_settings(metrics: %{
        enabled: true,
        endpoint: "https://otel.example.com",
        crontab: "*/5 * * * *"
      })

      stub_and_collect_metrics()
      run_export()
      metrics = collect_all_metrics()

      service_metrics = Enum.filter(metrics, &(&1["name"] == "plural.service.health"))
      assert length(service_metrics) == 5
    end

    @tag :capture_log
    test "continues exporting if a chunk fails" do
      project = insert(:project)
      cluster = insert(:cluster, project: project, pinged_at: Timex.now())
      insert(:service, cluster: cluster, status: :healthy)

      deployment_settings(metrics: %{
        enabled: true,
        endpoint: "https://otel.example.com",
        crontab: "*/5 * * * *"
      })

      call_count = :counters.new(1, [])

      stub(Req, :post, fn _url, _opts ->
        count = :counters.get(call_count, 1)
        :counters.add(call_count, 1, 1)

        if count == 0 do
          {:error, :connection_refused}
        else
          {:ok, %Req.Response{status: 200, body: ""}}
        end
      end)

      run_export()
    end
  end

  describe "leader election" do
    test "schedules export when node is leader and config is valid" do
      project = insert(:project)
      cluster = insert(:cluster, project: project, pinged_at: Timex.now())
      insert(:service, cluster: cluster, status: :healthy)

      deployment_settings(metrics: %{
        enabled: true,
        endpoint: "https://otel.example.com",
        crontab: "* * * * *"
      })

      expect(Console.ClusterRing, :node, fn :otel_metrics -> node() end)

      {:ok, pid} = GenServer.start_link(MetricsExporter, :ok)
      send(pid, :check)
      :timer.sleep(100)

      state = :sys.get_state(pid)
      assert state.timer_ref != nil

      GenServer.stop(pid)
    end

    test "does not schedule when node is not leader" do
      insert(:cluster)
      insert(:service)

      deployment_settings(metrics: %{
        enabled: true,
        endpoint: "https://otel.example.com",
        crontab: "* * * * *"
      })

      expect(Console.ClusterRing, :node, fn :otel_metrics -> :other_node end)

      {:ok, pid} = GenServer.start_link(MetricsExporter, :ok)
      send(pid, :check)
      :timer.sleep(100)

      state = :sys.get_state(pid)
      assert state.timer_ref == nil

      GenServer.stop(pid)
    end

    test "cancels timer when leadership is lost" do
      deployment_settings(metrics: %{
        enabled: true,
        endpoint: "https://otel.example.com",
        crontab: "* * * * *"
      })

      expect(Console.ClusterRing, :node, fn :otel_metrics -> node() end)
      expect(Console.ClusterRing, :node, fn :otel_metrics -> :other_node end)

      {:ok, pid} = GenServer.start_link(MetricsExporter, :ok)

      send(pid, :check)
      :timer.sleep(50)
      state1 = :sys.get_state(pid)
      assert state1.timer_ref != nil

      send(pid, :check)
      :timer.sleep(50)
      state2 = :sys.get_state(pid)
      assert state2.timer_ref == nil

      GenServer.stop(pid)
    end

    @tag :capture_log
    test "does not schedule when crontab is invalid" do
      insert(:cluster)
      insert(:service)

      deployment_settings(metrics: %{
        enabled: true,
        endpoint: "https://otel.example.com",
        crontab: "invalid cron expression"
      })

      expect(Console.ClusterRing, :node, fn :otel_metrics -> node() end)

      {:ok, pid} = GenServer.start_link(MetricsExporter, :ok)
      send(pid, :check)
      :timer.sleep(100)

      state = :sys.get_state(pid)
      assert state.timer_ref == nil

      GenServer.stop(pid)
    end
  end

  describe "scheduling" do
    test "updates last_run_at after export" do
      project = insert(:project)
      cluster = insert(:cluster, project: project, pinged_at: Timex.now())
      insert(:service, cluster: cluster, status: :healthy)

      deployment_settings(metrics: %{
        enabled: true,
        endpoint: "https://otel.example.com",
        crontab: "*/5 * * * *"
      })

      stub(Req, :post, fn _url, _opts ->
        {:ok, %Req.Response{status: 200, body: ""}}
      end)

      {:ok, pid} = GenServer.start_link(MetricsExporter, :ok)

      state_before = :sys.get_state(pid)
      assert state_before.last_run_at == nil

      send(pid, :export)
      :timer.sleep(100)

      state_after = :sys.get_state(pid)
      assert state_after.last_run_at != nil

      GenServer.stop(pid)
    end

    test "clears timer_ref after export completes" do
      project = insert(:project)
      cluster = insert(:cluster, project: project, pinged_at: Timex.now())
      insert(:service, cluster: cluster, status: :healthy)

      deployment_settings(metrics: %{
        enabled: true,
        endpoint: "https://otel.example.com",
        crontab: "*/5 * * * *"
      })

      stub(Req, :post, fn _url, _opts ->
        {:ok, %Req.Response{status: 200, body: ""}}
      end)

      {:ok, pid} = GenServer.start_link(MetricsExporter, :ok)
      send(pid, :export)
      :timer.sleep(100)

      state = :sys.get_state(pid)
      assert state.timer_ref == nil

      GenServer.stop(pid)
    end
  end
end
