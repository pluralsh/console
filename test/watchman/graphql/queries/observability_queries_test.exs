defmodule Watchman.GraphQl.ObservabilityQueriesTest do
  use Watchman.DataCase, async: false
  alias Watchman.{Kube.Dashboard, Kube}
  use Mimic

  setup :set_mimic_global

  describe "dashboards" do
    test "it can list dashboards for a repo" do
      expect(Kazan, :run, fn _ -> {:ok, %Kube.DashboardList{items: [dashboard()]}} end)

      {:ok, %{data: %{"dashboards" => [found]}}} = run_query("""
        query Dashboards($repo: String!) {
          dashboards(repo: $repo) {
            id
            spec {
              name
              description
              timeslices
              graphs {
                queries {
                  query
                  legend
                }
                name
              }
            }
          }
        }
      """, %{"repo" => "repo"}, %{current_user: insert(:user)})

      assert found["id"] == "dashboard"
      assert found["spec"]["name"] == "dashboard"
      assert found["spec"]["timeslices"] == ["10m"]
      assert found["spec"]["description"] == "description"
      assert found["spec"]["graphs"] == [
        %{
          "name" => "queries",
          "queries" => [%{"query" => "some-query", "legend" => "legend"}]
        },
        %{
          "name" => "formatted",
          "queries" => [%{"query" => "formatted-query", "legend" => nil}]
        }
      ]
    end
  end

  describe "dashboard" do
    test "it can fetch a dashboard for a repo" do
      expect(Kazan, :run, fn _ -> {:ok, dashboard()} end)
      expect(HTTPoison, :post, 3, fn
        _, {:form, [{"query", "label-q"}, _, _, _]}, _ ->
          {:ok, %HTTPoison.Response{status_code: 200, body: Poison.encode!(%{data: %{result: [%{metric: %{other: "l"}}]}})}}
        _, {:form, [{"query", "some-query"}, _, _, _]}, _ ->
          {:ok, %HTTPoison.Response{status_code: 200, body: Poison.encode!(%{data: %{result: [
            %{values: [[1, "1"]]}
          ]}})}}
        _, {:form, [{"query", "formatted-query"}, _, _, _]}, _ ->
          {:ok, %HTTPoison.Response{status_code: 200, body: Poison.encode!(%{data: %{result: [
            %{metric: %{"var" => "val"}, values: [[1, "1"]]},
            %{metric: %{"var" => "val2"}, values: [[1, "1"]]}
          ]}})}}
      end)

      {:ok, %{data: %{"dashboard" => found}}} = run_query("""
        query Dashboards($repo: String!, $name: String!) {
          dashboard(repo: $repo, name: $name) {
            id
            spec {
              name
              description
              timeslices
              labels {
                name
                values
              }
              graphs {
                queries {
                  query
                  legend
                  results {
                    timestamp
                    value
                  }
                }
                name
              }
            }
          }
        }
      """, %{"repo" => "repo", "name" => "name"}, %{current_user: insert(:user)})

      assert found["id"] == "dashboard"
      assert found["spec"]["name"] == "dashboard"
      assert found["spec"]["timeslices"] == ["10m"]
      assert found["spec"]["description"] == "description"
      assert found["spec"]["labels"] == [
        %{"name" => "label", "values" => ["value"]},
        %{"name" => "other", "values" => ["l"]}
      ]
      assert found["spec"]["graphs"] == [
        %{
          "name" => "queries",
          "queries" => [
            %{"query" => "some-query", "legend" => "legend", "results" => [%{"timestamp" => 1, "value" => "1"}]}
          ]
        },
        %{
          "name" => "formatted",
          "queries" => [
            %{"query" => "formatted-query", "legend" => "legend-val", "results" => [%{"timestamp" => 1, "value" => "1"}]},
            %{"query" => "formatted-query", "legend" => "legend-val2", "results" => [%{"timestamp" => 1, "value" => "1"}]}
          ]
        }
      ]
    end
  end

  describe "logs" do
    test "it can fetch logs for a loki query" do
      expect(HTTPoison, :get, fn _ ->
        {:ok, %HTTPoison.Response{status_code: 200, body: Poison.encode!(%{data: %{result: [
            %{stream: %{"var" => "val"}, values: [["1", "hello"]]},
            %{stream: %{"var" => "val2"}, values: [["1", "world"]]}
          ]}}
        )}}
      end)

      {:ok, %{data: %{"logs" => [first, second]}}} = run_query("""
        query Logs($query: String!, $limit: Int!) {
          logs(query: $query, limit: $limit) {
            stream
            values {
              timestamp
              value
            }
          }
        }
      """, %{"query" => ~s({namespace="watchman"}), "limit" => 100}, %{current_user: insert(:user)})

      assert first["stream"]["var"] == "val"
      assert first["values"] == [%{"timestamp" => 1, "value" => "hello"}]

      assert second["stream"]["var"] == "val2"
      assert second["values"] == [%{"timestamp" => 1, "value" => "world"}]
    end
  end

  def dashboard() do
    %Dashboard{
      metadata: %{
        name: "dashboard"
      },
      spec: %Dashboard.Spec{
        name: "dashboard",
        description: "description",
        timeslices: ["10m"],
        labels: [
          %Dashboard.Label{name: "label", values: ["value"]},
          %Dashboard.Label{name: "other", query: %{query: "label-q", label: "other"}}
        ],
        graphs: [
          %Dashboard.Graph{
            name: "queries",
            queries: [
              %Dashboard.Query{
                query: "some-query",
                legend: "legend"
              }
            ]
          },
          %Dashboard.Graph{
            name: "formatted",
            queries: [
              %Dashboard.Query{
                query: "formatted-query",
                legend_format: "legend-$var"
              }
            ]
          }
        ]
      }
    }
  end
end