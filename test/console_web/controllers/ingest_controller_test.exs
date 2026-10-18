defmodule ConsoleWeb.IngestControllerTest do
  use ConsoleWeb.ConnCase, async: true
  use Mimic
  alias ConsoleWeb.Plugs.Ingest

  describe "plural telemetry" do
    setup do
      stub(Console, :conf, fn
        :cloud_instance -> "test"
        :plural_o11y -> true
        :telemetry_url -> "https://telemetry.example.com"
        :es_url -> "http://test.es.com"
        :es_password -> "secret"
        key -> Application.get_env(:console, key, nil)
      end)
      :ok
    end

    test "it routes ingest and query urls to telemetry" do
      assert Ingest.prom_url() == "https://telemetry.example.com/metrics/write/ns/test/api/v1/write"
      assert Ingest.prom_select_url() == "https://telemetry.example.com/metrics/read/ns/test"
      assert Ingest.elastic_url("/_bulk") == "https://telemetry.example.com/logs/write/ns/test/elasticsearch/_bulk"
      assert Ingest.loki_push_url() == "https://telemetry.example.com/logs/write/ns/test/loki/api/v1/push"
    end

    test "it emulates elasticsearch info endpoints", %{conn: conn} do
      conn = get(conn, "/ext/v1/ingest/elastic/")
      assert %{"version" => %{"number" => "8.11.0"}} = json_response(conn, 200)
      assert get_resp_header(conn, "x-elastic-product") == ["Elasticsearch"]

      conn = get(build_conn(), "/ext/v1/ingest/elastic/_license")
      assert %{"license" => %{"type" => "basic"}} = json_response(conn, 200)
    end
  end

  describe "legacy cloud o11y" do
    setup do
      stub(Console, :conf, fn
        :cloud_instance -> "test"
        :plural_o11y -> false
        :es_url -> "http://test.es.com"
        :es_password -> "secret"
        :vmetrics_url -> "http://vmetrics.example.com"
        :vmetrics_tenant -> "tenant"
        key -> Application.get_env(:console, key, nil)
      end)
      :ok
    end

    test "it routes ingest and query urls to elastic and victoria metrics" do
      assert Ingest.prom_url() == "http://vmetrics.example.com/insert/tenant/prometheus/api/v1/write"
      assert Ingest.prom_select_url() == "http://vmetrics.example.com/select/tenant/prometheus"
      assert Ingest.elastic_url("/_bulk") == "http://test.es.com/_bulk"
    end

    test "loki push is unavailable", %{conn: conn} do
      conn =
        conn
        |> put_req_header("content-type", "application/json")
        |> post("/ext/v1/ingest/loki/api/v1/push", "{}")
      assert response(conn, 503)
    end
  end

  test "ingest is rejected when o11y is not configured", %{conn: conn} do
    stub(Console, :conf, fn
      :plural_o11y -> true
      :telemetry_url -> nil
      key -> Application.get_env(:console, key, nil)
    end)

    conn = get(conn, "/ext/v1/ingest/elastic/")
    assert response(conn, 401)
  end
end
