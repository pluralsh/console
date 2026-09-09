defmodule Console.AI.Tools.Workbench.Observability.ExternalProvidersTest do
  use Console.DataCase, async: true
  use Mimic

  alias Console.AI.Tools.Workbench.Observability.External.Client
  alias Console.AI.Tools.Workbench.Observability.External.{
    Azure,
    Dynatrace,
    Sentry,
    Splunk
  }

  test "Dynatrace delegates to the document dashboard API" do
    tool =
      insert(:workbench_tool,
        tool: :dynatrace,
        name: "dynatrace",
        categories: [:metrics],
        configuration: %{
          dynatrace: %{url: "https://example.apps.dynatrace.com", platform_token: "token"}
        }
      )

    Req.Test.stub(Dynatrace, fn conn ->
      assert conn.request_path == "/platform/document/v1/documents"
      assert ["Bearer token"] = Plug.Conn.get_req_header(conn, "authorization")
      assert %{"filter" => "type = 'dashboard'", "page-key" => "next", "page-size" => "25"} =
               Plug.Conn.fetch_query_params(conn).query_params

      Req.Test.json(conn, %{
        documents: [%{id: "doc-1", name: "API", type: "dashboard", content: %{sections: []}}],
        nextPageKey: "after"
      })
    end)

    assert {:ok, %{dashboards: [%{id: "doc-1", title: "API"}], next_cursor: "after"}} =
             Client.list_dashboards(tool, nil, 25, nil, "next")
  end

  test "Dynatrace delegates to the settings objects monitor API" do
    tool =
      insert(:workbench_tool,
        tool: :dynatrace,
        name: "dynatrace",
        categories: [:metrics],
        configuration: %{
          dynatrace: %{url: "https://example.apps.dynatrace.com", platform_token: "token"}
        }
      )

    Req.Test.stub(Dynatrace, fn conn ->
      assert conn.request_path == "/platform/classic/environment-api/v2/settings/objects"
      assert %{
               "fields" => "objectId,schemaId,summary,searchSummary,scope,value",
               "filter" => "value.title contains 'cpu' or value.summary contains 'cpu'",
               "pageSize" => "25",
               "schemaIds" =>
                 "builtin:davis.anomaly-detectors,builtin:anomaly-detection.metric-events"
             } = Plug.Conn.fetch_query_params(conn).query_params

      Req.Test.json(conn, %{
        items: [
          %{
            objectId: "obj-1",
            summary: "CPU",
            value: %{title: "High CPU", description: "CPU saturation"}
          }
        ],
        nextPageKey: "after",
        totalCount: 40
      })
    end)

    assert {:ok,
            %{
              monitors: [%{id: "obj-1", title: "High CPU"}],
              next_cursor: "after",
              total: 40
            }} =
             Client.list_monitors(tool, "cpu", 25)
  end

  test "Splunk delegates to the views API" do
    tool =
      insert(:workbench_tool,
        tool: :splunk,
        name: "splunk",
        categories: [:logs],
        configuration: %{splunk: %{url: "https://splunk.example.com", token: "token"}}
      )

    Req.Test.stub(Splunk, fn conn ->
      assert conn.request_path == "/servicesNS/-/-/data/ui/views"
      assert ["Bearer token"] = Plug.Conn.get_req_header(conn, "authorization")
      assert %{
               "count" => "25",
               "offset" => "25",
               "output_mode" => "json",
               "search" => ~s(name="*api*" OR label="*api*")
             } = Plug.Conn.fetch_query_params(conn).query_params

      Req.Test.json(conn, %{
        entry: [%{name: "api", content: %{label: "API", description: "API health"}}],
        paging: %{total: 100}
      })
    end)

    assert {:ok, %{dashboards: [%{id: "api", title: "API"}], next_cursor: "26"}} =
             Client.list_dashboards(tool, "api", 25, nil, "25")
  end

  test "Splunk delegates to the saved searches alert API" do
    tool =
      insert(:workbench_tool,
        tool: :splunk,
        name: "splunk",
        categories: [:logs],
        configuration: %{splunk: %{url: "https://splunk.example.com", token: "token"}}
      )

    Req.Test.stub(Splunk, fn conn ->
      assert conn.request_path == "/servicesNS/-/-/saved/searches"
      assert %{
               "count" => "25",
               "offset" => "0",
               "output_mode" => "json",
               "search" => "alert.track=1 AND (name=\"*api*\" OR title=\"*api*\")"
             } = Plug.Conn.fetch_query_params(conn).query_params

      Req.Test.json(conn, %{
        entry: [%{name: "api_alert", content: %{label: "API", description: "API errors"}}],
        paging: %{total: 26}
      })
    end)

    assert {:ok,
            %{
              monitors: [%{id: "api_alert", title: "API"}],
              next_cursor: "1",
              total: 26
            }} =
             Client.list_monitors(tool, "api", 25)
  end

  test "Sentry delegates to the organization dashboards API" do
    tool =
      insert(:workbench_tool,
        tool: :sentry,
        name: "sentry",
        categories: [:error_tracking],
        configuration: %{sentry: %{url: "https://sentry.example.com", access_token: "token"}}
      )

    Req.Test.stub(Sentry, fn conn ->
      assert conn.request_path == "/api/0/organizations/acme/dashboards/"
      assert ["Bearer token"] = Plug.Conn.get_req_header(conn, "authorization")
      assert %{"cursor" => "next", "per_page" => "25", "query" => "errors"} =
               Plug.Conn.fetch_query_params(conn).query_params
      Req.Test.json(conn, [%{id: "1", title: "Errors", widgets: []}])
    end)

    assert {:ok, %{dashboards: [%{id: "1", title: "Errors"}]}} =
             Sentry.list_dashboards(tool, scope: "acme", q: "errors", limit: 25, cursor: "next")
  end

  test "Sentry delegates to the organization metric alert rules API" do
    tool =
      insert(:workbench_tool,
        tool: :sentry,
        name: "sentry",
        categories: [:error_tracking],
        configuration: %{sentry: %{url: "https://sentry.example.com", access_token: "token"}}
      )

    Req.Test.stub(Sentry, fn conn ->
      assert conn.request_path == "/api/0/organizations/acme/alert-rules/"
      assert %{"cursor" => "next", "per_page" => "25", "query" => "errors"} =
               Plug.Conn.fetch_query_params(conn).query_params
      Req.Test.json(conn, [%{id: "7", name: "Errors", query: "is:unresolved", aggregate: "count()"}])
    end)

    assert {:ok, %{monitors: [%{id: "7", title: "Errors"}]}} =
             Sentry.list_monitors(tool, scope: "acme", q: "errors", limit: 25, cursor: "next")
  end

  test "Azure obtains a token and lists portal dashboards" do
    tool =
      insert(:workbench_tool,
        tool: :azure,
        name: "azure",
        categories: [:metrics],
        configuration: %{
          azure: %{
            subscription_id: "sub",
            tenant_id: "tenant",
            client_id: "client",
            client_secret: "secret"
          }
        }
      )

    Req.Test.stub(Azure, fn conn ->
      case conn.request_path do
        "/tenant/oauth2/v2.0/token" ->
          Req.Test.json(conn, %{access_token: "token"})

        "/subscriptions/sub/providers/Microsoft.Portal/dashboards" ->
          assert ["Bearer token"] = Plug.Conn.get_req_header(conn, "authorization")
          Req.Test.json(conn, %{value: [%{id: "/subscriptions/sub/dashboards/api", name: "API"}]})
      end
    end)

    assert {:ok, %{dashboards: [%{title: "API"}]}} = Client.list_dashboards(tool, nil, 25)
  end

  test "Azure lists metric alerts then scheduled query rules" do
    tool =
      insert(:workbench_tool,
        tool: :azure,
        name: "azure",
        categories: [:metrics],
        configuration: %{
          azure: %{
            subscription_id: "sub",
            tenant_id: "tenant",
            client_id: "client",
            client_secret: "secret"
          }
        }
      )

    Req.Test.stub(Azure, fn conn ->
      case conn.request_path do
        "/tenant/oauth2/v2.0/token" ->
          Req.Test.json(conn, %{access_token: "token"})

        "/subscriptions/sub/providers/Microsoft.Insights/metricAlerts" ->
          Req.Test.json(conn, %{
            value: [
              %{
                id: "/subscriptions/sub/providers/microsoft.insights/metricalerts/cpu",
                name: "cpu",
                properties: %{description: "High CPU"}
              }
            ]
          })
      end
    end)

    assert {:ok,
            %{
              monitors: [%{title: "cpu"}],
              next_cursor: "scheduledQueryRules"
            }} = Client.list_monitors(tool, nil, 25)
  end

  test "CloudWatch uses ExAws dashboard list requests" do
    tool =
      insert(:workbench_tool,
        tool: :cloudwatch,
        name: "cloudwatch",
        categories: [:metrics],
        configuration: %{
          cloudwatch: %{
            region: "us-east-1",
            access_key_id: "access",
            secret_access_key: "secret"
          }
        }
      )

    expect(ExAws, :request, fn operation, config ->
      assert %ExAws.Operation.Query{
               action: :list_dashboards,
               params: %{"Action" => "ListDashboards", "Version" => "2010-08-01"}
             } = operation

      assert config == [
               region: "us-east-1",
               access_key_id: "access",
               secret_access_key: "secret"
             ]

      {:ok,
       %{
         body: %{
           dashboards: [
             %{
               dashboard_name: "API",
               dashboard_arn: "arn:aws:cloudwatch::dashboard/API",
               last_modified: "today",
               size: 10
             }
           ],
           next_token: ""
         }
       }}
    end)

    assert {:ok, %{dashboards: [%{id: "API", title: "API"}]}} =
             Client.list_dashboards(tool, nil, 25)
  end

  test "CloudWatch uses ExAws describe alarms for monitors" do
    tool =
      insert(:workbench_tool,
        tool: :cloudwatch,
        name: "cloudwatch",
        categories: [:metrics],
        configuration: %{
          cloudwatch: %{
            region: "us-east-1",
            access_key_id: "access",
            secret_access_key: "secret"
          }
        }
      )

    expect(ExAws, :request, fn operation, config ->
      assert %ExAws.Operation.Query{action: :describe_alarms} = operation
      assert operation.params["MaxRecords"] in [25, "25"]
      assert config[:region] == "us-east-1"

      {:ok,
       %{
         body: %{
           alarms: [
             %{
               alarm_name: "API",
               alarm_description: "API latency",
               alarm_arn: "arn:aws:cloudwatch:us-east-1:alarm:API",
               threshold: 1.0
             }
           ],
           next_token: "next"
         }
       }}
    end)

    assert {:ok, %{monitors: [%{id: "API", title: "API"}], next_cursor: "next"}} =
             Client.list_monitors(tool, nil, 25)
  end
end
