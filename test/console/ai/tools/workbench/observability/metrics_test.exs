defmodule Console.AI.Tools.Workbench.Observability.MetricsTest do
  use Console.DataCase, async: true
  use Mimic
  alias CloudQuery.Client
  alias Console.AI.Tools.Workbench.Observability.Metrics
  alias Toolquery.ToolQuery.Stub
  alias Toolquery.{MetricSample, MetricSeries, MetricsSeriesOutput}

  describe "implement/1" do
    test "it gives the model labels once per series with compact samples and stores series" do
      tool = insert(:workbench_tool,
        name: "prom",
        tool: :prometheus,
        categories: [:metrics],
        configuration: %{prometheus: %{url: "https://prom.example.com", token: "token", tenant_id: nil}}
      )
      now = DateTime.utc_now() |> DateTime.truncate(:second)
      ts = DateTime.to_unix(now)

      expect(Client, :connect, fn -> {:ok, :mock_conn} end)
      expect(Stub, :metrics_series, fn :mock_conn, _input, _opts ->
        {:ok,
         %MetricsSeriesOutput{
           series: [
             %MetricSeries{
               name: "http_requests_total",
               labels: %{"method" => "GET"},
               samples: [
                 %MetricSample{timestamp: Google.Protobuf.from_datetime(now), value: 1.5},
                 %MetricSample{timestamp: Google.Protobuf.from_datetime(DateTime.add(now, 30)), value: :nan}
               ]
             },
             %MetricSeries{name: "", labels: %{}, samples: [%MetricSample{timestamp: Google.Protobuf.from_datetime(now), value: 2.0}]},
             %MetricSeries{name: "dropped", labels: %{}, samples: [%MetricSample{timestamp: Google.Protobuf.from_datetime(now), value: :infinity}]}
           ]
         }}
      end)

      {:ok, %{content: content, series: series}} =
        Metrics.implement(%Metrics{tool: tool, query: "sum(rate(http_requests_total[5m])) by (method)"})

      assert Jason.decode!(content) == %{
               "sample_format" => "[unix_seconds, value]",
               "series" => [
                 %{"name" => "http_requests_total", "labels" => %{"method" => "GET"}, "samples" => [[ts, 1.5]]},
                 %{"samples" => [[ts, 2.0]]}
               ]
             }

      assert [
               %{name: "http_requests_total", labels: %{"method" => "GET"}, samples: [%{timestamp: stored_ts, value: 1.5}]},
               %{name: "", samples: [%{value: 2.0}]}
             ] = series
      assert DateTime.compare(stored_ts, now) == :eq
    end
  end

  describe "stored_series/1" do
    test "it caps series and thins each one evenly, keeping the first and last sample" do
      start = ~U[2026-10-19 00:00:00Z]
      series =
        for i <- 1..60 do
          %{name: "s#{i}", labels: %{}, samples: Enum.map(0..99, &%{timestamp: DateTime.add(start, &1 * 60), value: &1 * 1.0})}
        end

      stored = Metrics.stored_series(series)
      assert length(stored) == 50

      for %{samples: samples} <- stored do
        assert length(samples) == 20
        assert hd(samples).value == 0.0
        assert List.last(samples).value == 99.0
      end
    end

    test "it leaves small results untouched" do
      series = [%{name: "up", labels: %{}, samples: [%{timestamp: ~U[2026-10-19 00:00:00Z], value: 1.0}]}]
      assert Metrics.stored_series(series) == series
    end
  end

  describe "group_points/1" do
    test "it groups flat points into series in first-seen order" do
      t1 = ~U[2026-10-19 00:00:00Z]
      t2 = ~U[2026-10-19 00:01:00Z]
      points = [
        %{name: "up", labels: %{"pod" => "b"}, timestamp: t1, value: 1.0},
        %{name: "up", labels: %{"pod" => "a"}, timestamp: t1, value: 2.0},
        %{name: "up", labels: %{"pod" => "b"}, timestamp: t2, value: 3.0}
      ]

      assert Metrics.group_points(points) == [
               %{name: "up", labels: %{"pod" => "b"}, samples: [%{timestamp: t1, value: 1.0}, %{timestamp: t2, value: 3.0}]},
               %{name: "up", labels: %{"pod" => "a"}, samples: [%{timestamp: t1, value: 2.0}]}
             ]

      assert Metrics.flatten_series(Metrics.group_points(points)) |> length() == 3
    end
  end
end
