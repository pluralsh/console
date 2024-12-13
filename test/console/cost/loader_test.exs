defmodule Console.Cost.LoaderTest do
  use Console.DataCase, async: false
  use Mimic
  alias Console.Cost.{Extract, Loader}
  alias Console.Schema.{
    ClusterUsage,
    ClusterNamespaceUsage,
    ClusterScalingRecommendation
  }
  import Console.Cost.Utils, only: [replace: 2]
  import Console.Repo, only: [all: 1]

  setup :set_mimic_global

  describe "#load/0" do
    @tag :skip
    test "it can load and compile cost information" do
      deployment_settings(prometheus_connection: %{host: "https://prom.example.com"}, cost: %{enabled: true})
      cluster = insert(:cluster)

      mock_data = Extract.queries()
                  |> Map.new(fn {k, v} -> {replace(v, cluster: cluster.handle), k} end)

      expect(HTTPoison, :post, map_size(mock_data), fn _, {:form, args}, _ ->
        {_, query} = Enum.find(args, &elem(&1, 0) == "query")
        case Map.get(mock_data, query) do
          nil -> {:error, "unmocked query #{query}"}
          res ->
            body = Path.join("testdata", "#{res}.json") |> File.read!()
            {:ok, %HTTPoison.Response{status_code: 200, body: body}}
        end
      end)

      :ok = Loader.load()

      [cost] = all(ClusterUsage)

      assert cost.cluster_id == cluster.id

      ns = all(ClusterNamespaceUsage)

      assert length(ns) == 8
      assert Enum.all?(ns, & &1.cluster_id == cluster.id)

      recs = all(ClusterScalingRecommendation)

      assert length(recs) == 12
      assert Enum.all?(ns, & &1.cluster_id == cluster.id)
    end
  end
end
