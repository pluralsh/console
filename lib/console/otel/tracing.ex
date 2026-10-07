defmodule Console.Otel.Tracing do
  @moduledoc """
  Boots OpenTelemetry instrumentation for Phoenix/Bandit, Absinthe, Ecto, and ReqLLM.

  Tracing is opt-in: runtime configuration enables export only when an OTLP
  endpoint is present. `span/3` is always safe to call; with the exporter
  disabled it records locally and is discarded.

  Secrets are stripped before export: repository and database `.url`
  attributes are reduced to host/path, HTTP query strings are removed from
  the Bandit telemetry conn before the request span is created, and GraphQL
  documents/variables/error payloads are not recorded.
  """
  require Logger
  require OpenTelemetry.Tracer

  @network_schemes ~w(http https ssh git oci postgres postgresql)
  @bandit_handler_id {OpentelemetryBandit, :otel_bandit}
  @bandit_events [
    [:bandit, :request, :start],
    [:bandit, :request, :stop],
    [:bandit, :request, :exception]
  ]

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
  become `host/path`. Unsupported schemes, URLs with userinfo and no host,
  `://` values that cannot be redacted, and fallback paths that still look
  like `user:secret` are dropped.
  """
  @spec sanitize_url(term) :: String.t() | nil
  def sanitize_url(url) when is_binary(url) and byte_size(url) > 0 do
    url
    |> URI.parse()
    |> sanitize_parsed(url)
  end
  def sanitize_url(_), do: nil

  @doc """
  Absinthe trace options shared by both GraphQL endpoints.

  Documents, variables, and response errors are not exported. Clients can
  embed tokens and passwords as inline literals, and Absinthe validation
  errors can echo those values. Operation name, type, and field selections
  still record.
  """
  @spec absinthe_trace_options() :: keyword
  def absinthe_trace_options do
    [
      trace_request_query: false,
      trace_request_variables: false,
      trace_response_result: false,
      trace_response_errors: false
    ]
  end

  @doc """
  Overrides Ecto's `db.url` so `POSTGRES_URL` userinfo never leaves the process.
  """
  @spec ecto_span_attributes() :: map()
  def ecto_span_attributes do
    config = Application.get_env(:console, Console.Repo, [])
    case Keyword.get(config, :url) do
      url when is_binary(url) -> %{:"db.url" => sanitize_url(url) || "ecto://redacted"}
      _ -> %{}
    end
  end

  @doc false
  def handle_bandit_request(event, measurements, metadata, config) do
    OpentelemetryBandit.handle_request(
      event,
      measurements,
      strip_http_query_metadata(metadata),
      config
    )
  end

  @doc false
  def strip_http_query_metadata(%{conn: %Plug.Conn{} = conn} = metadata) do
    %{metadata | conn: %{conn | query_string: ""}}
  end
  def strip_http_query_metadata(metadata), do: metadata

  defp configured_endpoint do
    Application.get_env(:opentelemetry_exporter, :otlp_traces_endpoint) ||
      Application.get_env(:opentelemetry_exporter, :otlp_endpoint)
  end

  defp setup_instrumentation do
    OpentelemetryBandit.setup()
    wrap_bandit_query_redaction()
    OpentelemetryPhoenix.setup(adapter: :bandit)
    OpentelemetryEcto.setup([:console, :repo], additional_attributes: ecto_span_attributes())
    OpentelemetryAbsinthe.setup(absinthe_trace_options())

    case ReqLLM.OpenTelemetry.attach("req-llm-open-telemetry", content: :none) do
      :ok -> :ok
      {:error, :already_exists} -> :ok
      {:error, :opentelemetry_unavailable} -> :ok
      {:error, reason} ->
        Logger.warning("Unable to attach ReqLLM OpenTelemetry instrumentation: #{inspect(reason)}")
        :ok
    end
  end

  defp wrap_bandit_query_redaction do
    case bandit_handler_config() do
      {:ok, config} ->
        :telemetry.detach(@bandit_handler_id)

        :telemetry.attach_many(
          @bandit_handler_id,
          @bandit_events,
          &__MODULE__.handle_bandit_request/4,
          config
        )

      :error ->
        Logger.warning("Unable to wrap Bandit OpenTelemetry handler to drop HTTP query strings")
        :ok
    end
  end

  defp bandit_handler_config do
    Enum.find_value(:telemetry.list_handlers(hd(@bandit_events)), :error, fn
      %{id: @bandit_handler_id, config: config} -> {:ok, config}
      _ -> nil
    end)
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

  defp sanitize_parsed(%URI{scheme: scheme, host: host} = uri, _original)
       when scheme in @network_schemes and is_binary(host) and byte_size(host) > 0 do
    redact_uri(uri)
  end
  defp sanitize_parsed(%URI{scheme: "file"} = uri, _original), do: redact_uri(uri)
  defp sanitize_parsed(%URI{userinfo: userinfo}, _original) when is_binary(userinfo), do: nil
  defp sanitize_parsed(%URI{scheme: scheme, host: host}, _original)
       when is_binary(scheme) and is_binary(host) and byte_size(host) > 0 do
    nil
  end
  defp sanitize_parsed(_uri, original) do
    case String.contains?(original, "://") do
      true -> nil
      false ->
        original
        |> strip_query_fragment()
        |> sanitize_scp()
    end
  end

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
      [_, host, path] ->
        path = String.trim_leading(path, "/")
        case String.contains?(path, [":", "@"]) do
          true -> nil
          false -> "#{host}/#{path}"
        end
      _ ->
        drop_if_userinfo(url)
    end
  end

  defp drop_if_userinfo(value) when is_binary(value) do
    case String.contains?(value, "@") do
      true -> nil
      false -> value
    end
  end
  defp drop_if_userinfo(_), do: nil
end
