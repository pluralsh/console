defmodule Watchman.GraphQl.DashboardQueriesTest do
  use Watchman.DataCase, async: true
  alias Watchman.{Kube.Dashboard, Kube}
  use Mimic


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
              labels {
                name
                values
              }
              queries {
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
      assert found["spec"]["labels"] == [%{"name" => "label", "values" => ["value"]}]
      assert found["spec"]["queries"] == [
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
              queries {
                queries {
                  query
                  legend
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
      assert found["spec"]["labels"] == [%{"name" => "label", "values" => ["value"]}]
      assert found["spec"]["queries"] == [
        %{
          "name" => "queries",
          "queries" => [%{"query" => "some-query", "legend" => "legend"}]
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
        labels: [%Dashboard.Label{name: "label", values: ["value"]}],
        queries: [
          %Dashboard.Queries{
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