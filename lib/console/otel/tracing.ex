defmodule Console.Otel.Tracing do
  @moduledoc """
  Boots OpenTelemetry instrumentation for Phoenix/Bandit, Absinthe, Ecto, and ReqLLM.

  Tracing is opt-in: runtime configuration enables export only when an OTLP
  endpoint is present. `span/3` is always safe to call; with the exporter
  disabled it records locally and is discarded. Repository `.url` attributes
  are reduced to host/path so credentials and signed query parameters are
  never exported.
  """
  require Logger
  require OpenTelemetry.Tracer

  @network_schemes ~w(http https ssh git oci)

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
  Attributes whose keys are `url` or end in `.url` are sanitized so
  userinfo, query strings, and fragments are never exported.
  """
  @spec span(String.t(), map(), (-> result)) :: result when result: var
  def span(name, attrs \\ %{}, fun)
      when is_binary(name) and is_map(attrs) and is_function(fun, 0) do
    OpenTelemetry.Tracer.with_span name, %{attributes: compact_attrs(attrs)} do
      fun.()
    end
  end

  @doc """
  Drops credentials, signed query parameters, and fragments from a repository URL.

  Returns host/path (with scheme when it is a real URL). SCP-style Git remotes
  become `host/path`. Unparseable values that still look secret are dropped.
  """
  @spec sanitize_url(term) :: String.t() | nil
  def sanitize_url(url) when is_binary(url) and byte_size(url) > 0 do
    case URI.parse(url) do
      %URI{scheme: scheme, host: host} = uri
           when scheme in @network_schemes and is_binary(host) and byte_size(host) > 0 ->
        redact_uri(uri)

      %URI{scheme: "file"} = uri ->
        redact_uri(uri)

      _ ->
        url
        |> strip_query_fragment()
        |> sanitize_scp()
    end
  end
  def sanitize_url(_), do: nil

  @doc """
  Absinthe trace options shared by both GraphQL endpoints.

  Documents are not exported: clients can embed tokens and passwords as
  inline literals, and `trace_request_variables: false` does not redact
  those. Operation name, type, and field selections still record.
  """
  @spec absinthe_trace_options() :: keyword
  def absinthe_trace_options do
    [
      trace_request_query: false,
      trace_request_variables: false,
      trace_response_errors: true
    ]
  end

  defp configured_endpoint do
    Application.get_env(:opentelemetry_exporter, :otlp_traces_endpoint) ||
      Application.get_env(:opentelemetry_exporter, :otlp_endpoint)
  end

  defp setup_instrumentation do
    OpentelemetryBandit.setup()
    OpentelemetryPhoenix.setup(adapter: :bandit)
    OpentelemetryEcto.setup([:console, :repo])
    OpentelemetryAbsinthe.setup(absinthe_trace_options())

    case ReqLLM.OpenTelemetry.attach() do
      :ok -> :ok
      {:error, :opentelemetry_unavailable} -> :ok
      {:error, reason} ->
        Logger.warning("Unable to attach ReqLLM OpenTelemetry instrumentation: #{inspect(reason)}")
        :ok
    end
  end

  defp compact_attrs(attrs) do
    attrs
    |> Enum.map(&sanitize_attr/1)
    |> Map.new()
    |> Map.reject(fn {_key, value} -> is_nil(value) end)
  end

  defp sanitize_attr({key, value}) when is_binary(value) do
    case url_attr?(key) do
      true -> {key, sanitize_url(value)}
      false -> {key, value}
    end
  end
  defp sanitize_attr(pair), do: pair

  defp url_attr?(key) when is_atom(key), do: url_attr?(Atom.to_string(key))
  defp url_attr?("url"), do: true
  defp url_attr?(key) when is_binary(key), do: String.ends_with?(key, ".url")
  defp url_attr?(_), do: false

  defp redact_uri(%URI{} = uri) do
    %{uri | userinfo: nil, query: nil, fragment: nil}
    |> URI.to_string()
  end

  defp strip_query_fragment(url) do
    url
    |> String.split("#", parts: 2)
    |> hd()
    |> String.split("?", parts: 2)
    |> hd()
  end

  defp sanitize_scp(url) do
    case Regex.run(~r/^(?:[^@]+@)?([^:]+):(.+)$/, url) do
      [_, host, path] -> "#{host}/#{String.trim_leading(path, "/")}"
      _ -> scp_fallback(url)
    end
  end

  defp scp_fallback(url) do
    case String.contains?(url, "@") do
      true -> nil
      false -> url
    end
  end
end
