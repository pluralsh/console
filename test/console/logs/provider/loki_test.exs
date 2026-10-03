defmodule Console.Logs.Provider.LokiTest do
  use Console.DataCase, async: false
  use Mimic
  alias Console.Logs.{Provider, Query, Time, Line, AggregationBucket}
  alias Console.Logs.Provider.Loki
  alias Console.Schema.DeploymentSettings.Loki, as: Connection

  setup :set_mimic_global

  @conn %Connection{host: "http://loki:3100", user: "user", password: "pass"}

  defp params(url) do
    %URI{path: path, query: query} = URI.parse(url)
    {path, URI.decode_query(query)}
  end

  describe "build_query/2" do
    test "it scopes a service query to its cluster and namespace with a case-insensitive line filter" do
      svc = insert(:service, namespace: "my-ns")

      q = %{Query.new(query: "error|timeout", pod: "my-pod") | resource: svc}

      assert Loki.build_query(@conn, q) ==
        ~s<{cluster="#{svc.cluster.handle}", namespace="my-ns", pod="my-pod"} |~ "(?i)error|timeout">
    end

    test "it uses overridden cluster and namespace labels" do
      svc = insert(:service, namespace: "my-ns")
      conn = %{@conn | cluster_label: "k8s_cluster_name", namespace_label: "k8s_namespace_name"}

      assert Loki.build_query(conn, %{Query.new([]) | resource: svc}) ==
        ~s({k8s_cluster_name="#{svc.cluster.handle}", k8s_namespace_name="my-ns"})

      assert Loki.build_query(conn, Query.new(namespaces: ["a"])) == ~s({k8s_namespace_name=~"a"})
      assert Loki.build_query(conn, Query.new([])) == ~s({k8s_cluster_name=~".+"})
    end

    test "it scopes cluster queries and adds namespaces and facets as label matchers" do
      cluster = insert(:cluster, handle: "prod")

      q = %{
        Query.new(namespaces: ["a.b", "c"], facets: [%{key: "container", value: "app"}, %{key: "k8s.node", value: "n1"}])
        | resource: cluster
      }

      assert Loki.build_query(@conn, q) ==
        ~s({cluster="prod", namespace=~"a\\\\.b|c", container="app", k8s_node="n1"})
    end

    test "it ors whitespace separated terms by default" do
      assert Loki.build_query(@conn, Query.new(query: "connection  refused")) ==
        ~s<{cluster=~".+"} |~ "(?i)connection" or "(?i)refused">
    end

    test "it matches the whole query as a single regex for the and operator" do
      assert Loki.build_query(@conn, Query.new(query: " connection refused ", operator: :and)) ==
        ~s<{cluster=~".+"} |~ "(?i)connection refused">
    end

    test "it doesn't double up an explicit case-insensitive flag and ignores blank queries" do
      assert Loki.build_query(@conn, Query.new(query: "(?i)Boom")) == ~s<{cluster=~".+"} |~ "(?i)Boom">
      assert Loki.build_query(@conn, Query.new(query: "   ")) == ~s({cluster=~".+"})
    end

    test "it escapes quotes and backslashes in the regex and falls back to a non-empty selector" do
      q = Query.new(query: ~S(say\s"hi" \d+), operator: :and)
      assert Loki.build_query(@conn, q) == ~S<{cluster=~".+"} |~ "(?i)say\\s\"hi\" \\d+">
    end
  end

  describe "query/2" do
    test "it queries query_range and flattens streams into lines in reverse chronological order" do
      cluster = insert(:cluster, handle: "prod")
      aft = ~U[2026-10-01 00:00:00Z]
      bef = ~U[2026-10-01 01:00:00Z]

      expect(Req, :get, fn url, opts ->
        {path, params} = params(url)
        assert path == "/loki/api/v1/query_range"
        assert params["query"] == ~s<{cluster="prod"} |~ "(?i)boom">
        assert params["start"] == "#{DateTime.to_unix(aft, :nanosecond)}"
        assert params["end"] == "#{DateTime.to_unix(bef, :nanosecond)}"
        assert params["limit"] == "2"
        assert params["direction"] == "backward"
        assert {"Authorization", _} = List.keyfind(opts[:headers], "Authorization", 0)

        {:ok, %Req.Response{status: 200, body: Jason.encode!(%{
          status: "success",
          data: %{resultType: "streams", result: [
            %{stream: %{"pod" => "a"}, values: [["1759276800000000001", "first"], ["1759276800000000003", "third"]]},
            %{stream: %{"pod" => "b"}, values: [["1759276800000000002", "second", %{"trace_id" => "x"}]]}
          ]}
        })}}
      end)

      q = %{Query.new(query: "boom", limit: 2, time: %{after: aft, before: bef}) | resource: cluster}
      {:ok, [%Line{} = first, %Line{} = second]} = Loki.query(Loki.new(@conn), q)

      assert first.log == "third"
      assert first.facets == [%{key: "pod", value: "a"}]
      assert second.log == "second"
      assert second.facets == [%{key: "pod", value: "b"}]
      assert first.timestamp == DateTime.from_unix!(1759276800000000003, :nanosecond)
    end

    test "it queries forward for reversed time ranges and computes the range from a duration" do
      bef = ~U[2026-10-01 01:00:00Z]

      expect(Req, :get, fn url, _ ->
        {_, params} = params(url)
        assert params["direction"] == "forward"
        assert params["start"] == "#{DateTime.to_unix(~U[2026-10-01 00:30:00Z], :nanosecond)}"
        {:ok, %Req.Response{status: 200, body: Jason.encode!(%{data: %{resultType: "streams", result: []}})}}
      end)

      q = Query.new(time: %Time{before: bef, duration: "30m", reverse: true})
      {:ok, []} = Loki.query(Loki.new(@conn), q)
    end

    test "it surfaces loki errors" do
      expect(Req, :get, fn _, _ -> {:ok, %Req.Response{status: 400, body: "parse error"}} end)

      {:error, err} = Loki.query(Loki.new(@conn), Query.new(query: "("))
      assert err =~ "parse error"
    end
  end

  describe "aggregate/2" do
    test "it buckets counts with count_over_time" do
      expect(Req, :get, fn url, _ ->
        {_, params} = params(url)
        assert params["query"] == ~s<sum(count_over_time({cluster=~".+"} |~ "(?i)err" [300s]))>
        assert params["step"] == "300"

        {:ok, %Req.Response{status: 200, body: Jason.encode!(%{
          data: %{resultType: "matrix", result: [%{metric: %{}, values: [[1759276800, "4"], [1759277100, "7"]]}]}
        })}}
      end)

      {:ok, [first, second]} = Loki.aggregate(Loki.new(@conn), Query.new(query: "err", bucket_size: "5m"))
      assert %AggregationBucket{count: 4} = first
      assert first.timestamp == DateTime.from_unix!(1759276800)
      assert %AggregationBucket{count: 7} = second
    end
  end

  describe "labels/2" do
    test "it counts values of a label" do
      expect(Req, :get, fn url, _ ->
        {path, params} = params(url)
        assert path == "/loki/api/v1/query"
        assert params["query"] =~ ~r/^topk\(100, sum by \(container\) \(count_over_time\(\{cluster=~"\.\+"\} \[\d+s\]\)\)\)$/

        {:ok, %Req.Response{status: 200, body: Jason.encode!(%{
          data: %{resultType: "vector", result: [
            %{metric: %{container: "a"}, value: [1759276800, "2"]},
            %{metric: %{container: "b"}, value: [1759276800, "9"]}
          ]}
        })}}
      end)

      {:ok, labels} = Loki.labels(Loki.new(@conn), Query.new(field: "container"))
      assert labels == [%{label: "b", count: 9}, %{label: "a", count: 2}]
    end
  end

  describe "Provider.client/1" do
    test "it selects the loki driver" do
      settings = deployment_settings(logging: %{enabled: true, driver: :loki, loki: %Connection{host: "http://loki:3100"}})
      assert {:ok, %Loki{connection: %Connection{host: "http://loki:3100"}}} = Provider.client(settings)
    end
  end

  describe "DeploymentSettings.Loki.changeset/2" do
    test "it defaults the cluster and namespace labels" do
      %Connection{} = conn = Connection.changeset(%Connection{}, %{host: "http://loki"}) |> Ecto.Changeset.apply_changes()
      assert conn.cluster_label == "cluster"
      assert conn.namespace_label == "namespace"
    end

    test "it allows overriding labels but rejects invalid label names" do
      cs = Connection.changeset(%Connection{}, %{host: "http://loki", cluster_label: "k8s_cluster_name"})
      assert cs.valid?

      cs = Connection.changeset(%Connection{}, %{host: "http://loki", namespace_label: "k8s.namespace"})
      refute cs.valid?
    end
  end
end
