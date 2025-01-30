defmodule Console.GraphQl.ObservabilityQueriesTest do
  use Console.DataCase, async: false
  alias Kube.Dashboard
  use Mimic
  import KubernetesScaffolds
  alias ElasticsearchHelper, as: ES

  setup :set_mimic_global

  @elastic_cluster_url Application.compile_env(:elasticsearch_test, :cluster_url)
  @elastic_index_name Application.compile_env(:elasticsearch_test, :index_name)

  describe "dashboards" do
    test "it can list dashboards for a repo" do
      user = insert(:user)
      role = insert(:role, repositories: ["*"], permissions: %{read: true})
      insert(:role_binding, role: role, user: user)
      expect(Kazan, :run, fn _ -> {:ok, %Kube.Dashboard.List{items: [dashboard()]}} end)

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
      """, %{"repo" => "repo"}, %{current_user: user})

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
      user = insert(:user)
      role = insert(:role, repositories: ["*"], permissions: %{read: true})
      insert(:role_binding, role: role, user: user)
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
      """, %{"repo" => "repo", "name" => "name"}, %{current_user: user})

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
            %{"query" => "some-query", "legend" => "legend", "results" => [%{"timestamp" => "1", "value" => "1"}]}
          ]
        },
        %{
          "name" => "formatted",
          "queries" => [
            %{"query" => "formatted-query", "legend" => "legend-val", "results" => [%{"timestamp" => "1", "value" => "1"}]},
            %{"query" => "formatted-query", "legend" => "legend-val2", "results" => [%{"timestamp" => "1", "value" => "1"}]}
          ]
        }
      ]
    end
  end

  describe "logs" do
    test "it can fetch logs for a loki query" do
      expect(HTTPoison, :get, fn _, _ ->
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
      """, %{"query" => ~s({namespace="console"}), "limit" => 100}, %{current_user: insert(:user)})

      assert first["stream"]["var"] == "val"
      assert first["values"] == [%{"timestamp" => "1", "value" => "hello"}]

      assert second["stream"]["var"] == "val2"
      assert second["values"] == [%{"timestamp" => "1", "value" => "world"}]
    end
  end

  describe "metric" do
    test "it can fetch metrics from prometheus" do
      expect(HTTPoison, :post, fn _, _, _ ->
        {:ok, %HTTPoison.Response{status_code: 200, body: Poison.encode!(%{data: %{result: [
          %{values: [[1, "1"]]}
        ]}})}}
      end)

      {:ok, %{data: %{"metric" => [metric]}}} = run_query("""
        query Metric($q: String!) {
          metric(query: $q) {
            values {
              timestamp
              value
            }
          }
        }
      """, %{"q" => "something"}, %{current_user: insert(:user)})

      assert metric["values"] == [%{"timestamp" => "1", "value" => "1"}]
    end
  end

  describe "logAggregation" do
    test "it can fetch from a logs db" do
      user = insert(:user)
      svc = insert(:service, read_bindings: [%{user_id: user.id}])
      expect(Console.Logs.Provider, :query, fn _ -> {:ok, [log_line("a log")]} end)

      {:ok, %{data: %{"logAggregation" => [line]}}} = run_query("""
        query Logs($serviceId: ID!) {
          logAggregation(serviceId: $serviceId) { timestamp log }
        }
      """, %{"serviceId" => svc.id}, %{current_user: user})

      assert line["log"] == "a log"
    end

    test "it can fetch logs from an elasticsearch index" do
      user = insert(:user)
      svc = insert(:service, read_bindings: [%{user_id: user.id}])

      # We want a fresh index so delete the index if it already exists
      # Just in case test fails we want to make sure next run doesn't reuse old index
      with true <- ES.index_exists?(@elastic_cluster_url, @elastic_index_name) do
        ES.delete_index(@elastic_cluster_url, @elastic_index_name)
      end

      ES.create_index(@elastic_cluster_url, @elastic_index_name)

      ES.index_documents(@elastic_cluster_url, @elastic_index_name, [
        %{
          "@timestamp" => Timex.now(),
          "message" => "valid log message",
          "kubernetes" => %{
            "namespace" => svc.namespace
          },
          "cluster" => %{
            "handle" => svc.cluster.handle
          }
        },
        %{
          "@timestamp" => Timex.now(),
          "log" => "NOT a valid log message"
        }
      ])

      # Instead of using expect to mock the logs provider, we use the elasticsearch index
      deployment_settings(logging: %{enabled: true, driver: :elastic, elastic: %{
        host: @elastic_cluster_url,
        index: @elastic_index_name
      }})


      {:ok, %{data: %{"logAggregation" => [line]}}} = run_query("""
        query Logs($serviceId: ID!) {
          logAggregation(serviceId: $serviceId) { timestamp log }
        }
      """, %{"serviceId" => svc.id}, %{current_user: user})

      # Delete index, otherwise it will just use resources until next test run
      ES.delete_index(@elastic_cluster_url, @elastic_index_name)

      assert line["log"] == "valid log message"
    end

    test "it will authz" do
      user = insert(:user)
      svc = insert(:service)

      {:ok, %{errors: [_ | _]}} = run_query("""
        query Logs($serviceId: ID!) {
          logAggregation(serviceId: $serviceId) { timestamp log }
        }
      """, %{"serviceId" => svc.id}, %{current_user: user})
    end
  end

  describe "scalingRecommendation" do
    test "it can fetch a vpa to provide recommendations" do
      user = insert(:user)
      expect(Kazan, :run, fn _ -> {:ok, vertical_pod_autoscaler("name")} end)

      {:ok, %{data: %{"scalingRecommendation" => found}}} = run_query("""
        query {
          scalingRecommendation(kind: STATEFULSET, name: "name", namespace: "namespace") {
            metadata { name namespace }
            spec { updatePolicy { updateMode } }
          }
        }
      """, %{}, %{current_user: user})

      assert found["metadata"]["name"] == "name"
      assert found["spec"]["updatePolicy"]["updateMode"] == "Off"
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
          %Dashboard.Spec.Labels{name: "label", values: ["value"]},
          %Dashboard.Spec.Labels{name: "other", query: %{query: "label-q", label: "other"}}
        ],
        graphs: [
          %Dashboard.Spec.Graphs{
            name: "queries",
            queries: [
              %Dashboard.Spec.Graphs.Queries{
                query: "some-query",
                legend: "legend"
              }
            ]
          },
          %Dashboard.Spec.Graphs{
            name: "formatted",
            queries: [
              %Dashboard.Spec.Graphs.Queries{
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
