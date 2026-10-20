defmodule Console.AI.Tools.Workbench.Observability.TracesTest do
  use Console.DataCase, async: true
  use Mimic
  alias CloudQuery.Client
  alias Console.AI.Tools.Workbench.Observability.{Traces, TraceFacets}
  alias Toolquery.ToolQuery.Stub
  alias Toolquery.{TracesQueryOutput, TraceSpan, TraceFacetsOutput, TraceFacetValue, TraceAttributeFilter}

  defp tempo_tool do
    insert(:workbench_tool,
      name: "tempo",
      tool: :tempo,
      categories: [:traces],
      configuration: %{tempo: %{url: "https://tempo.example.com", token: "token", tenant_id: nil}}
    )
  end

  defp span(trace_id, span_id, parent_id, start, ms, attrs) do
    %TraceSpan{
      trace_id: trace_id,
      span_id: span_id,
      parent_id: parent_id,
      name: attrs[:name],
      service: attrs[:service],
      start: Google.Protobuf.from_datetime(start),
      end: Google.Protobuf.from_datetime(DateTime.add(start, ms, :millisecond)),
      tags: attrs[:tags] || %{}
    }
  end

  describe "changeset/2" do
    test "it requires a query or filters" do
      refute Traces.changeset(%Traces{}, %{}).valid?
      assert Traces.changeset(%Traces{}, %{"query" => "{}"}).valid?
      assert Traces.changeset(%Traces{}, %{"filters" => %{"service" => "checkout"}}).valid?
      assert Traces.changeset(%Traces{}, %{"filters" => %{"errors_only" => true}}).valid?
      refute Traces.changeset(%Traces{}, %{"filters" => %{"errors_only" => false}}).valid?
    end
  end

  describe "implement/1" do
    test "it sends structured filters and summarizes spans per trace" do
      tool = tempo_tool()
      now = ~U[2026-01-01 00:00:00Z]

      expect(Client, :connect, fn -> {:ok, :mock_conn} end)
      expect(Stub, :traces, fn :mock_conn, input, _opts ->
        assert input.query == ""
        assert input.filters.service == "checkout"
        assert input.filters.errors_only
        assert input.filters.attributes == [%TraceAttributeFilter{name: "http.route", value: "/orders"}]

        {:ok, %TracesQueryOutput{spans: [
          span("t1", "db", "root", DateTime.add(now, 10, :millisecond), 40, name: "SELECT orders", service: "checkout", tags: %{"otel.status_code" => "ERROR"}),
          span("t1", "root", "", now, 100, name: "POST /orders", service: "checkout"),
          span("t2", "only", "missing", DateTime.add(now, 1, :second), 5, name: "GET /", service: "frontend")
        ]}}
      end)

      {:ok, attrs} =
        %Traces{tool: tool}
        |> Traces.changeset(%{"filters" => %{
          "service" => "checkout",
          "errors_only" => true,
          "attributes" => [%{"name" => "http.route", "value" => "/orders"}]
        }})
        |> Ecto.Changeset.apply_action(:insert)

      {:ok, %{content: content, traces: traces}} = Traces.implement(attrs)

      assert length(traces) == 3
      assert %{"trace_count" => 2, "span_count" => 3, "traces" => [t2, t1]} = Jason.decode!(content)

      assert t2["root"] == "frontend: GET /"
      assert t1["root"] == "checkout: POST /orders"
      assert t1["duration_ms"] == 100.0
      assert t1["error_count"] == 1
      assert t1["services"] == ["checkout"]
      assert [%{"span_id" => "root", "error" => false}, %{"span_id" => "db", "duration_ms" => 40.0, "error" => true}] = t1["spans"]
    end
  end

  describe "TraceFacets.implement/1" do
    test "it lists facet values with counts" do
      tool = tempo_tool()

      expect(Client, :connect, fn -> {:ok, :mock_conn} end)
      expect(Stub, :trace_facets, fn :mock_conn, input, _opts ->
        assert input.attribute == "name"
        assert input.filters.service == "checkout"
        assert input.range

        {:ok, %TraceFacetsOutput{values: [
          %TraceFacetValue{name: "POST /orders", count: 12},
          %TraceFacetValue{name: "GET /orders"}
        ]}}
      end)

      {:ok, attrs} =
        %TraceFacets{tool: tool}
        |> TraceFacets.changeset(%{"attribute" => "name", "filters" => %{"service" => "checkout"}})
        |> Ecto.Changeset.apply_action(:insert)

      {:ok, content} = TraceFacets.implement(attrs)
      assert Jason.decode!(content) == [%{"name" => "POST /orders", "count" => 12}, %{"name" => "GET /orders"}]
    end
  end
end
