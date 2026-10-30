defmodule Console.Logs.Provider.ElasticTest do
  use Console.DataCase, async: false
  use Mimic

  alias Console.Logs.Query
  alias Console.Logs.Provider.Elastic
  alias Console.Schema.DeploymentSettings.Elastic, as: Connection

  setup :set_mimic_global

  @conn %Connection{host: "http://elastic", index: "plrl-logs-*", user: "user", password: "pass"}

  describe "query/2" do
    test "uses the message field analyzer for text queries while preserving the operator" do
      expect(Req, :post, fn "http://elastic/plrl-logs-*/_search", opts ->
        body = Jason.decode!(opts[:body])
        match = get_in(body, ["query", "bool", "must", "match", "message"])

        assert match == %{"query" => "request_id_123", "operator" => "AND"}
        refute Map.has_key?(match, "analyzer")

        {:ok, %Req.Response{status: 200, body: Jason.encode!(%{"hits" => %{"hits" => []}})}}
      end)

      assert {:ok, []} =
               Elastic.query(
                 Elastic.new(@conn),
                 Query.new(query: "request_id_123", operator: :and)
               )
    end

    test "filters by node on any common node field" do
      expect(Req, :post, fn _, opts ->
        filters = get_in(Jason.decode!(opts[:body]), ["query", "bool", "filter"])
        [%{"bool" => %{"should" => should, "minimum_should_match" => 1}}] =
          Enum.filter(filters, &Map.has_key?(&1, "bool"))

        fields = Enum.flat_map(should, fn %{"term" => term} -> Map.keys(term) end)
        assert "kubernetes.node.name" in fields
        assert "kubernetes.host.keyword" in fields
        assert "k8s.node.name.keyword" in fields
        assert Enum.all?(should, fn %{"term" => term} -> Map.values(term) == ["node-1"] end)

        {:ok, %Req.Response{status: 200, body: Jason.encode!(%{"hits" => %{"hits" => []}})}}
      end)

      assert {:ok, []} = Elastic.query(Elastic.new(@conn), Query.new(node: "node-1"))
    end

    test "filters levels on every common spelling" do
      expect(Req, :post, fn _, opts ->
        filters = get_in(Jason.decode!(opts[:body]), ["query", "bool", "filter"])
        [%{"terms" => %{"log.level.keyword" => spellings}}] = Enum.filter(filters, &Map.has_key?(&1, "terms"))
        assert "ERROR" in spellings
        assert "err" in spellings
        refute "info" in spellings

        {:ok, %Req.Response{status: 200, body: Jason.encode!(%{"hits" => %{"hits" => []}})}}
      end)

      assert {:ok, []} = Elastic.query(Elastic.new(@conn), Query.new(levels: [:error]))
    end
  end

  describe "aggregate/2" do
    test "groups by level and merges spellings of a level" do
      expect(Req, :post, fn _, opts ->
        agg = get_in(Jason.decode!(opts[:body]), ["aggs", "logs_over_time"])
        assert agg["aggs"]["by_level"]["terms"]["field"] == "log.level.keyword"

        {:ok, %Req.Response{status: 200, body: Jason.encode!(%{
          "hits" => %{"hits" => []},
          "aggregations" => %{"logs_over_time" => %{"buckets" => [
            %{"key_as_string" => "2026-10-01T00:00:00.000Z", "key" => 1759276800000, "doc_count" => 6, "by_level" => %{"buckets" => [
              %{"key" => "ERROR", "doc_count" => 2},
              %{"key" => "err", "doc_count" => 1},
              %{"key" => "unknown", "doc_count" => 3}
            ]}}
          ]}}
        })}}
      end)

      {:ok, buckets} = Elastic.aggregate(Elastic.new(@conn), Query.new(group_by_level: true))
      assert buckets |> Enum.map(&{&1.level, &1.count}) |> Enum.sort() == [error: 3, unknown: 3]
    end
  end
end
