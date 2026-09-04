defmodule Console.Otel.Tracing do
  @moduledoc """
  Boots the OpenTelemetry SDK and Console's request/LLM instrumentation.

  Tracing is opt-in: runtime configuration enables it only when an OTLP
  endpoint is present. This keeps normal local and test runs unchanged while
  allowing a deployed Console instance to emit real Workbench request traces.
  """
  require Logger

  @spec setup() :: :ok
  def setup do
    case configured_endpoint() do
      endpoint when is_binary(endpoint) and byte_size(endpoint) > 0 ->
        setup_instrumentation()

      _ ->
        :ok
    end
  end

  defp configured_endpoint do
    System.get_env("OTEL_EXPORTER_OTLP_TRACES_ENDPOINT") ||
      System.get_env("OTEL_EXPORTER_OTLP_ENDPOINT")
  end

  defp setup_instrumentation do
    OpentelemetryBandit.setup()
    OpentelemetryPhoenix.setup(adapter: :bandit)

    case ReqLLM.OpenTelemetry.attach() do
      :ok -> :ok
      {:error, :opentelemetry_unavailable} -> :ok
      {:error, reason} ->
        Logger.warning("Unable to attach ReqLLM OpenTelemetry instrumentation: #{inspect(reason)}")
        :ok
    end
  end
end
