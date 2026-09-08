defmodule Console.Otel.Tracing do
  @moduledoc """
  Boots OpenTelemetry instrumentation for Phoenix/Bandit, Absinthe, Ecto, and ReqLLM.

  Tracing is opt-in: runtime configuration enables export only when an OTLP
  endpoint is present. `span/3` is always safe to call; with the exporter
  disabled it records locally and is discarded.
  """
  require Logger
  require OpenTelemetry.Tracer

  @spec setup() :: :ok
  def setup do
    case configured_endpoint() do
      endpoint when is_binary(endpoint) and byte_size(endpoint) > 0 ->
        setup_instrumentation()

      _ ->
        :ok
    end
  end

  @doc """
  Runs `fun` inside a named span. Nil attribute values are omitted.
  """
  @spec span(String.t(), map(), (-> result)) :: result when result: var
  def span(name, attrs \\ %{}, fun)
      when is_binary(name) and is_map(attrs) and is_function(fun, 0) do
    OpenTelemetry.Tracer.with_span name, %{attributes: compact_attrs(attrs)} do
      fun.()
    end
  end

  defp configured_endpoint do
    Application.get_env(:opentelemetry_exporter, :otlp_traces_endpoint) ||
      Application.get_env(:opentelemetry_exporter, :otlp_endpoint)
  end

  defp setup_instrumentation do
    OpentelemetryBandit.setup()
    OpentelemetryPhoenix.setup(adapter: :bandit)
    OpentelemetryEcto.setup([:console, :repo])
    OpentelemetryAbsinthe.setup(
      trace_request_query: true,
      trace_request_variables: false,
      trace_response_errors: true
    )

    case ReqLLM.OpenTelemetry.attach() do
      :ok -> :ok
      {:error, :opentelemetry_unavailable} -> :ok
      {:error, reason} ->
        Logger.warning("Unable to attach ReqLLM OpenTelemetry instrumentation: #{inspect(reason)}")
        :ok
    end
  end

  defp compact_attrs(attrs) do
    Map.reject(attrs, fn {_key, value} -> is_nil(value) end)
  end
end
