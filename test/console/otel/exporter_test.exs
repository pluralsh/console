defmodule Console.Otel.ExporterTest do
  use Console.DataCase, async: false
  use Mimic
  alias Console.Otel.Exporter

  setup :set_mimic_global

  describe "export/2" do
    test "it sends correctly formatted OTLP JSON to the endpoint" do
      timestamp = ~U[2024-01-15 10:00:00Z]

      metrics = [
        %{
          name: "plural.service.health",
          value: 2,
          timestamp: timestamp,
          attributes: %{
            cluster: "prod",
            name: "api",
            namespace: "apps"
          }
        }
      ]

      expect(Req, :post, fn url, opts ->
        assert url == "https://otel-collector.example.com/v1/metrics"

        payload = opts[:json]
        assert payload["resourceMetrics"]

        [resource_metric] = payload["resourceMetrics"]

        resource_attrs = resource_metric["resource"]["attributes"]
        assert Enum.any?(resource_attrs, &(&1["key"] == "service.name" && &1["value"]["stringValue"] == "plural-console"))

        [scope_metric] = resource_metric["scopeMetrics"]
        assert scope_metric["scope"]["name"] == "plural.metrics"

        [metric] = scope_metric["metrics"]
        assert metric["name"] == "plural.service.health"
        assert metric["gauge"]["dataPoints"]

        [data_point] = metric["gauge"]["dataPoints"]
        assert data_point["asInt"] == 2
        assert data_point["timeUnixNano"] == DateTime.to_unix(timestamp, :nanosecond)

        attrs = Map.new(data_point["attributes"], fn a -> {a["key"], a["value"]} end)
        assert attrs["cluster"]["stringValue"] == "prod"
        assert attrs["name"]["stringValue"] == "api"
        assert attrs["namespace"]["stringValue"] == "apps"

        {:ok, %Req.Response{status: 200, body: ""}}
      end)

      assert :ok = Exporter.export("https://otel-collector.example.com", metrics)
    end

    test "it appends /v1/metrics to the endpoint" do
      expect(Req, :post, fn url, _opts ->
        assert url == "https://otel.example.com/v1/metrics"
        {:ok, %Req.Response{status: 200, body: ""}}
      end)

      Exporter.export("https://otel.example.com", [%{name: "test", value: 1, attributes: %{}}])
    end

    test "it handles trailing slash in endpoint" do
      expect(Req, :post, fn url, _opts ->
        assert url == "https://otel.example.com/v1/metrics"
        {:ok, %Req.Response{status: 200, body: ""}}
      end)

      Exporter.export("https://otel.example.com/", [%{name: "test", value: 1, attributes: %{}}])
    end

    test "it filters out nil attribute values" do
      metrics = [
        %{
          name: "test.metric",
          value: 1,
          attributes: %{
            present: "value",
            missing: nil,
            also_present: "another"
          }
        }
      ]

      expect(Req, :post, fn _url, opts ->
        [resource_metric] = opts[:json]["resourceMetrics"]
        [scope_metric] = resource_metric["scopeMetrics"]
        [metric] = scope_metric["metrics"]
        [data_point] = metric["gauge"]["dataPoints"]

        attr_keys = Enum.map(data_point["attributes"], & &1["key"])

        assert "present" in attr_keys
        assert "also_present" in attr_keys
        refute "missing" in attr_keys

        {:ok, %Req.Response{status: 200, body: ""}}
      end)

      Exporter.export("https://otel.example.com", metrics)
    end

    test "it handles different attribute types" do
      metrics = [
        %{
          name: "test.metric",
          value: 1,
          attributes: %{
            string_attr: "hello",
            int_attr: 42,
            float_attr: 3.14,
            bool_attr: true,
            atom_attr: :some_atom
          }
        }
      ]

      expect(Req, :post, fn _url, opts ->
        [resource_metric] = opts[:json]["resourceMetrics"]
        [scope_metric] = resource_metric["scopeMetrics"]
        [metric] = scope_metric["metrics"]
        [data_point] = metric["gauge"]["dataPoints"]

        attrs = Map.new(data_point["attributes"], fn a -> {a["key"], a["value"]} end)

        assert attrs["string_attr"] == %{"stringValue" => "hello"}
        assert attrs["int_attr"] == %{"intValue" => 42}
        assert attrs["float_attr"] == %{"doubleValue" => 3.14}
        assert attrs["bool_attr"] == %{"boolValue" => true}
        assert attrs["atom_attr"] == %{"stringValue" => "some_atom"}

        {:ok, %Req.Response{status: 200, body: ""}}
      end)

      Exporter.export("https://otel.example.com", metrics)
    end

    @tag :capture_log
    test "it returns error on HTTP failure" do
      expect(Req, :post, fn _url, _opts ->
        {:ok, %Req.Response{status: 503, body: "service unavailable"}}
      end)

      assert {:error, {:http_error, 503, "service unavailable"}} =
        Exporter.export("https://otel.example.com", [%{name: "test", value: 1, attributes: %{}}])
    end

    @tag :capture_log
    test "it returns error on network failure" do
      expect(Req, :post, fn _url, _opts ->
        {:error, %Mint.TransportError{reason: :timeout}}
      end)

      assert {:error, %Mint.TransportError{reason: :timeout}} =
        Exporter.export("https://otel.example.com", [%{name: "test", value: 1, attributes: %{}}])
    end

    test "it uses default timestamp when not provided" do
      metrics = [%{name: "test", value: 1, attributes: %{}}]

      expect(Req, :post, fn _url, opts ->
        [resource_metric] = opts[:json]["resourceMetrics"]
        [scope_metric] = resource_metric["scopeMetrics"]
        [metric] = scope_metric["metrics"]
        [data_point] = metric["gauge"]["dataPoints"]

        assert is_integer(data_point["timeUnixNano"])
        assert data_point["timeUnixNano"] > 0

        {:ok, %Req.Response{status: 200, body: ""}}
      end)

      Exporter.export("https://otel.example.com", metrics)
    end

    test "it handles multiple metrics in a single export" do
      metrics = [
        %{name: "plural.service.health", value: 2, attributes: %{service: "api"}},
        %{name: "plural.service.health", value: -1, attributes: %{service: "web"}},
        %{name: "plural.cluster.health", value: 1, attributes: %{cluster: "prod"}}
      ]

      expect(Req, :post, fn _url, opts ->
        [resource_metric] = opts[:json]["resourceMetrics"]
        [scope_metric] = resource_metric["scopeMetrics"]
        exported_metrics = scope_metric["metrics"]

        assert length(exported_metrics) == 3

        service_metrics = Enum.filter(exported_metrics, &(&1["name"] == "plural.service.health"))
        cluster_metrics = Enum.filter(exported_metrics, &(&1["name"] == "plural.cluster.health"))

        assert length(service_metrics) == 2
        assert length(cluster_metrics) == 1

        {:ok, %Req.Response{status: 200, body: ""}}
      end)

      assert :ok = Exporter.export("https://otel.example.com", metrics)
    end

    test "it handles empty metrics list" do
      expect(Req, :post, fn _url, opts ->
        [resource_metric] = opts[:json]["resourceMetrics"]
        [scope_metric] = resource_metric["scopeMetrics"]
        exported_metrics = scope_metric["metrics"]

        assert exported_metrics == []

        {:ok, %Req.Response{status: 200, body: ""}}
      end)

      assert :ok = Exporter.export("https://otel.example.com", [])
    end
  end
end
