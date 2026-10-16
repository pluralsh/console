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
  end
end
