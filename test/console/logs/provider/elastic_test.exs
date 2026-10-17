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
  end
end
