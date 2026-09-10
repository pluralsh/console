defmodule Console.Schema.DashboardTest do
  use Console.DataCase, async: true

  alias Console.Schema.Dashboard

  describe "changeset/2" do
    test "accepts adjacent graphs" do
      changeset =
        Dashboard.changeset(%Dashboard{}, attrs([
          graph("left", 0, 0, 2, 2),
          graph("right", 2, 0, 2, 2)
        ]))

      assert changeset.valid?
    end

    test "rejects intersecting graphs" do
      changeset =
        Dashboard.changeset(%Dashboard{}, attrs([
          graph("left", 0, 0, 2, 2),
          graph("right", 1, 1, 2, 2)
        ]))

      refute changeset.valid?

      assert errors_on(changeset).graphs == [
               "graphs left and right have intersecting layout rectangles"
             ]
    end

    test "returns every intersecting graph pair" do
      changeset =
        Dashboard.changeset(%Dashboard{}, attrs([
          graph("first", 0, 0, 3, 3),
          graph("second", 1, 1, 3, 3),
          graph("third", 2, 2, 3, 3)
        ]))

      refute changeset.valid?

      assert MapSet.new(errors_on(changeset).graphs) ==
               MapSet.new([
                 "graphs first and second have intersecting layout rectangles",
                 "graphs first and third have intersecting layout rectangles",
                 "graphs second and third have intersecting layout rectangles"
               ])
    end

    test "requires positive graph dimensions" do
      changeset = Dashboard.changeset(%Dashboard{}, attrs([graph("invalid", 0, 0, 0, 1)]))

      refute changeset.valid?
      assert %{graphs: [%{layout: %{w: ["must be greater than 0"]}}]} = errors_on(changeset)
    end

    test "accepts tool-backed dashboard inputs" do
      changeset =
        Dashboard.changeset(
          %Dashboard{},
          attrs([])
          |> Map.put(:inputs, [
            %{
              name: "namespace",
              type: :select,
              datasource: %{
                type: :labels,
                tool: "workbench_observability_metric_label_search_prometheus",
                input: %{metric: "kube_pod_info", label: "namespace"}
              }
            }
          ])
        )

      assert changeset.valid?
      assert [%{datasource: %{type: :labels}}] = Ecto.Changeset.apply_changes(changeset).inputs
    end
  end

  defp attrs(graphs) do
    %{
      name: "Operations",
      workbench_id: Ecto.UUID.generate(),
      graphs: graphs
    }
  end

  defp graph(identifier, x, y, w, h) do
    %{
      identifier: identifier,
      type: :timeseries,
      layout: %{x: x, y: y, w: w, h: h},
      datasource: %{type: :metrics, tool: "prometheus_query", input: %{query: "up"}}
    }
  end
end
