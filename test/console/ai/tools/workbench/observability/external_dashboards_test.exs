defmodule Console.AI.Tools.Workbench.Observability.ExternalDashboardsTest do
  use Console.DataCase, async: true

  alias Console.AI.Tools.Workbench.Observability.{ExternalDashboard, ExternalDashboards}
  alias Console.AI.Tools.Workbench.Observability.ExternalDashboards.Datadog

  test "paginates Datadog dashboards at the API" do
    tool =
      insert(:workbench_tool,
        tool: :datadog,
        name: "datadog",
        categories: [:metrics],
        configuration: %{
          datadog: %{site: "datadoghq.com", api_key: "api", app_key: "app"}
        }
      )

    Req.Test.stub(Datadog, fn conn ->
      assert conn.request_path == "/api/v1/dashboard"
      assert Plug.Conn.fetch_query_params(conn).query_params == %{
               "count" => "1",
               "start" => "0"
             }
      assert ["api"] = Plug.Conn.get_req_header(conn, "dd-api-key")
      assert ["app"] = Plug.Conn.get_req_header(conn, "dd-application-key")

      Req.Test.json(conn, %{
        dashboards: [
          %{id: "abc", title: "API latency", description: "API health", widgets: []}
        ],
        total: 2
      })
    end)

    assert {:ok, json} =
             ExternalDashboards.implement(%ExternalDashboards{
               tool: tool,
               limit: 1
             })

    assert %{
             "dashboards" => [%{"id" => "abc", "definition" => %{"widgets" => []}}],
             "next_cursor" => "1"
           } = Jason.decode!(json)
  end

  test "fetches one provider dashboard by id" do
    tool =
      insert(:workbench_tool,
        tool: :datadog,
        name: "datadog",
        categories: [:metrics],
        configuration: %{
          datadog: %{site: "datadoghq.com", api_key: "api", app_key: "app"}
        }
      )

    Req.Test.stub(Datadog, fn conn ->
      assert conn.request_path == "/api/v1/dashboard/abc"

      Req.Test.json(conn, %{
        id: "abc",
        title: "API",
        widgets: []
      })
    end)

    assert {:ok, json} =
             ExternalDashboard.implement(%ExternalDashboard{
               tool: tool,
               dashboard_id: "abc"
             })

    assert %{"id" => "abc", "definition" => %{"widgets" => []}} = Jason.decode!(json)
  end
end
