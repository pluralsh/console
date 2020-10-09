defmodule Watchman.GraphQl.DashboardQueriesTest do
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
        }
      ]
    end
  end

  describe "dashboard" do
    test "it can fetch a dashboard for a repo" do
      expect(Kazan, :run, fn _ -> {:ok, dashboard()} end)
      expect(HTTPoison, :post, fn _, {:form, [{"query", "label-q"}, _, _, _]}, _ ->
        {:ok, %HTTPoison.Response{status_code: 200, body: Poison.encode!(%{data: %{result: [%{metric: %{other: "l"}}]}})}}
      end)
      expect(HTTPoison, :post, fn _, {:form, [{"query", "some-query"}, _, _, _]}, _ ->
        {:ok, %HTTPoison.Response{status_code: 200, body: Poison.encode!(%{data: %{result: [
          %{values: [[1, "1"]]}
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
            %{"query" => "some-query", "legend" => "legend", "results" => [%{"timestamp" => 1000, "value" => "1"}]}
          ]
        }
      ]
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
          }
        ]
      }
    }
  end
end