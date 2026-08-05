defmodule Console.AI.Tools.Workbench.Integration.Http do
  @moduledoc false

  @spec handle({:ok, Req.Response.t()} | {:error, term()}, String.t()) ::
          {:ok, term()} | {:error, String.t()}
  def handle({:ok, %Req.Response{status: code, body: body}}, service) when code >= 200 and code < 300,
    do: decode_json(service, body)

  def handle({:ok, %Req.Response{status: code, body: body}}, service),
    do: {:error, "#{service} API #{code}: #{inspect(body)}"}

  def handle({:error, reason}, service),
    do: error(service, reason)

  @spec decode_json(String.t(), binary()) :: {:ok, term()} | {:error, String.t()}
  def decode_json(_service, ""), do: {:ok, %{}}

  def decode_json(service, body) do
    case Jason.decode(body) do
      {:ok, data} -> {:ok, data}
      {:error, _} -> {:error, "#{service} returned non-JSON body: #{inspect(body)}"}
    end
  end

  @spec error(String.t(), term()) :: {:error, String.t()}
  def error(service, %Req.TransportError{reason: reason}),
    do: {:error, "#{service} request failed: #{format_reason(reason)}"}

  def error(service, reason),
    do: {:error, "#{service} request failed: #{inspect(reason)}"}

  defp format_reason({:tls_alert, {alert, message}}) when is_binary(message),
    do: "TLS #{alert}: #{message}"

  defp format_reason({:tls_alert, {alert, message}}) when is_list(message),
    do: "TLS #{alert}: #{List.to_string(message)}"

  defp format_reason({:tls_alert, alert}),
    do: "TLS #{inspect(alert)}"

  defp format_reason({:options, {:socket_options, opts}}),
    do: "invalid socket options: #{inspect(opts)}"

  defp format_reason(reason) when is_atom(reason),
    do: Atom.to_string(reason)

  defp format_reason(reason),
    do: inspect(reason)
end
