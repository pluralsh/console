defmodule Console.Otel.Exporter do
  @moduledoc """
  Simple OTLP JSON exporter for metrics over HTTP.
  Sends metrics to an OpenTelemetry Collector endpoint.
  """
  require Logger

  @default_timeout :timer.seconds(30)

  @doc """
  Exports a list of metrics to the configured OTLP endpoint.
  Returns :ok on success, {:error, reason} on failure.
  """
  @spec export(binary, [map]) :: :ok | {:error, term}
  def export(endpoint, metrics) when is_binary(endpoint) and is_list(metrics) do
    url = build_url(endpoint)
    payload = build_payload(metrics)

    case Req.post(url, json: payload, receive_timeout: @default_timeout) do
      {:ok, %Req.Response{status: status}} when status in 200..299 ->
        Logger.info("Successfully exported #{length(metrics)} metrics to #{endpoint}")
        :ok

      {:ok, %Req.Response{status: status, body: body}} ->
        Logger.error("Failed to export metrics to #{endpoint}: HTTP #{status} - #{inspect(body)}")
        {:error, {:http_error, status, body}}

      {:error, reason} ->
        Logger.error("Failed to export metrics to #{endpoint}: #{inspect(reason)}")
        {:error, reason}
    end
  end

  defp build_url(endpoint) do
    endpoint
    |> String.trim_trailing("/")
    |> Kernel.<>("/v1/metrics")
  end

  defp build_payload(metrics) do
    %{
      "resourceMetrics" => [
        %{
          "resource" => %{
            "attributes" => [
              %{"key" => "service.name", "value" => %{"stringValue" => "plural-console"}},
              %{"key" => "service.version", "value" => %{"stringValue" => Console.conf(:version)}}
            ]
          },
          "scopeMetrics" => [
            %{
              "scope" => %{"name" => "plural.metrics", "version" => "1.0.0"},
              "metrics" => Enum.map(metrics, &format_metric/1)
            }
          ]
        }
      ]
    }
  end

  defp format_metric(%{name: name, value: value, attributes: attrs} = metric) do
    timestamp = Map.get(metric, :timestamp, DateTime.utc_now())

    %{
      "name" => name,
      "gauge" => %{
        "dataPoints" => [
          %{
            "asInt" => value,
            "timeUnixNano" => DateTime.to_unix(timestamp, :nanosecond),
            "attributes" => format_attributes(attrs)
          }
        ]
      }
    }
  end

  defp format_attributes(attrs) when is_map(attrs) do
    attrs
    |> Enum.reject(fn {_k, v} -> is_nil(v) end)
    |> Enum.map(fn {key, value} ->
      %{
        "key" => to_string(key),
        "value" => format_attribute_value(value)
      }
    end)
  end

  defp format_attribute_value(value) when is_binary(value), do: %{"stringValue" => value}
  defp format_attribute_value(value) when is_integer(value), do: %{"intValue" => value}
  defp format_attribute_value(value) when is_float(value), do: %{"doubleValue" => value}
  defp format_attribute_value(value) when is_boolean(value), do: %{"boolValue" => value}
  defp format_attribute_value(value) when is_atom(value), do: %{"stringValue" => to_string(value)}
  defp format_attribute_value(value), do: %{"stringValue" => inspect(value)}
end
