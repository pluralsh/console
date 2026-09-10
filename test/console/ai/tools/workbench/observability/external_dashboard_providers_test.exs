defmodule Console.AI.Tools.Workbench.Observability.ExternalDashboardProvidersTest do
  use Console.DataCase, async: true
  use Mimic

  alias Console.AI.Tools.Workbench.Observability.ExternalDashboards.Client
  alias Console.AI.Tools.Workbench.Observability.ExternalDashboards.{
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
             Client.list(tool, nil, 25, nil, "next")
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
             Client.list(tool, "api", 25, nil, "25")
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
             Sentry.list(tool, scope: "acme", q: "errors", limit: 25, cursor: "next")
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

    assert {:ok, %{dashboards: [%{title: "API"}]}} = Client.list(tool, nil, 25)
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
             Client.list(tool, nil, 25)
  end
end
