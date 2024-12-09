defmodule Console.Cost.Extract do
  import Console.Services.Base, only: [when_ok: 2, timestamped: 1]
  import Console.Cost.Utils
  alias Prometheus.{Response, Result, Data}
  alias Console.Schema.{Cluster, DeploymentSettings}
  alias Console.Local.{
    PodMemoryRequest,
    PodCpuRequest,
    PodCpu,
    PodMemory,
    PodMemoryMax,
    PodOwnership
  }

  @headers [{"content-type", "application/x-www-form-urlencoded"}]

  @mem_requests ~s/avg(avg_over_time(kube_pod_container_resource_requests{resource="memory",unit="byte",container!="",container!="POD",node!="",cluster="{cluster}"}[1d])) by (container, pod, namespace)/
  @mem_avg ~s/avg(avg_over_time(container_memory_working_set_bytes{container!="",container!="POD",cluster="{cluster}"}[1d])) by (container, pod, namespace)/
  @mem_max ~s/max(max_over_time(container_memory_working_set_bytes{container!="",container!="POD",cluster="{cluster}"}[1d])) by (container, pod, namespace)/
  @cpu_avg ~s/avg(avg_over_time(kube_pod_container_resource_requests{resource="cpu",unit="core",container!="",container!="POD",cluster="{cluster}"}[1d])) by (container, pod, namespace)/
  @cpu_requests ~s/avg(rate(container_cpu_usage_seconds_total{container!="",container!="POD",cluster="{cluster}"}[1d])) by (container, pod, namespace)/
  @owner_req ~s/sum(avg_over_time(kube_pod_owner{cluster="{cluster}"}[1d])) by (pod, owner_kind, owner_name, namespace)/
  @deployments ~s/avg(avg_over_time(kube_replicaset_owner{owner_kind="Deployment",cluster="{cluster}"}[1d])) by (owner_name, pod, namespace)/

  def queries() do
    [
      mem_req: @mem_requests,
      mem_avg: @mem_avg,
      mem_max: @mem_max,
      cpu_avg: @cpu_avg,
      cpu_req: @cpu_requests,
      owner_req: @owner_req,
      deployments: @deployments
    ]
  end

  def extract(
    %Cluster{} = cluster,
    %DeploymentSettings{prometheus_connection: %DeploymentSettings.Connection{host: h} = conn}
  ) when is_binary(h) do
    Enum.map([
      &extract_mem_max/2,
      &extract_mem_avg/2,
      &extract_mem_requests/2,
      &extract_cpu_requests/2,
      &extract_cpu_avg/2,
      &owners/2,
      &deployments/2
    ], fn fun -> Task.async(fn -> fun.(cluster, conn) end) end)
    |> Enum.map(&Task.await/1)
    |> Enum.filter(fn
      {:error, _} -> true
      _ -> false
    end)
    |> case do
      [] -> :ok
      [_ | _] = errs -> {:error, "failed to extract metrics for #{cluster.handle}, reasons: #{inspect(errs)}"}
    end
  end
  def extract(_, _), do: {:error, "no prometheus connection configured"}

  defp extract_mem_requests(cluster, conn) do
    query_range(conn, replace(@mem_requests, cluster: cluster.handle))
    |> when_ok(fn %Response{data: %Data{result: result}} ->
      Stream.flat_map(result, &handle_metric(&1, cluster, :memory))
      |> batch_insert(PodMemoryRequest)
    end)
  end

  defp extract_mem_max(cluster, conn) do
    query_range(conn, replace(@mem_max, cluster: cluster.handle))
    |> when_ok(fn %Response{data: %Data{result: result}} ->
      Stream.flat_map(result, &handle_metric(&1, cluster, :memory))
      |> batch_insert(PodMemoryMax)
    end)
  end

  defp extract_mem_avg(cluster, conn) do
    query_range(conn, replace(@mem_avg, cluster: cluster.handle))
    |> when_ok(fn %Response{data: %Data{result: result}} ->
      Stream.flat_map(result, &handle_metric(&1, cluster, :memory))
      |> batch_insert(PodMemory)
    end)
  end

  defp extract_cpu_requests(cluster, conn) do
    query_range(conn, replace(@cpu_requests, cluster: cluster.handle))
    |> when_ok(fn %Response{data: %Data{result: result}} ->
      Stream.flat_map(result, &handle_metric(&1, cluster, :cpu))
      |> batch_insert(PodCpuRequest)
    end)
  end

  defp extract_cpu_avg(cluster, conn) do
    query_range(conn, replace(@cpu_avg, cluster: cluster.handle))
    |> when_ok(fn %Response{data: %Data{result: result}} ->
      Stream.flat_map(result, &handle_metric(&1, cluster, :cpu))
      |> batch_insert(PodCpu)
    end)
  end

  defp owners(cluster, conn) do
    query_range(conn, replace(@owner_req, cluster: cluster.handle))
    |> when_ok(fn %Response{data: %Data{result: result}} ->
      Stream.flat_map(result, &handle_ownership(&1, cluster))
      |> batch_insert(PodOwnership, conflict_target: [:cluster, :namespace, :pod], on_conflict: :nothing)
    end)
  end

  defp deployments(cluster, conn) do
    query_range(conn, replace(@deployments, cluster: cluster.handle))
    |> when_ok(fn %Response{data: %Data{result: result}} ->
      Stream.flat_map(result, &handle_ownership(&1, cluster))
      |> batch_insert(PodOwnership, conflict_target: [:cluster, :namespace, :pod], on_conflict: :nothing)
    end)
  end

  defp handle_metric(%Result{metric: %{"container" => c, "pod" => p, "namespace" => ns}, values: val}, cluster, metric) do
    Enum.map(val, fn [ts, val] ->
      Map.put(timestamped(%{
        timestamp: to_int(ts),
        container: c,
        pod: p,
        namespace: ns,
        cluster: cluster.handle
      }), metric, to_float(val))
    end)
  end
  defp handle_metric(_, _, _), do: []

  defp handle_ownership(%Result{
    metric: %{"pod" => p, "namespace" => ns, "owner_kind" => o, "owner_name" => on},
    values: val
  }, cluster) do
    Enum.map(val, fn [_, _] ->
      timestamped(%{
        type: String.downcase(o),
        owner: on,
        pod: p,
        namespace: ns,
        cluster: cluster.handle
      })
    end)
    |> Enum.filter(fn %{type: t} -> t in ~w(deployment statefulset daemonset rollout) end)
    |> Enum.uniq_by(fn %{pod: p, namespace: ns} -> {ns, p} end)
  end
  defp handle_ownership(_, _), do: []

  defp query_range(conn, query) do
    end_t   = Timex.now()
    start_t = Timex.now() |> Timex.shift(months: -1)
    Path.join(conn.host, "/api/v1/query_range")
    |> HTTPoison.post({:form, [
      {"query", query},
      {"end", DateTime.to_iso8601(end_t)},
      {"start", DateTime.to_iso8601(start_t)},
      {"step", "1d"}
    ]}, headers(conn))
    |> case do
      {:ok, %HTTPoison.Response{body: body, status_code: 200}} ->
        Poison.decode(body, as: Response.spec())
      _ -> {:error, "prometheus error"}
    end
  end

  defp headers(%DeploymentSettings.Connection{user: u, password: p}) when is_binary(u) and is_binary(p) do
    [{"Authorization", Plug.BasicAuth.encode_basic_auth(u, p)} | @headers]
  end
  defp headers(_), do: @headers
end
