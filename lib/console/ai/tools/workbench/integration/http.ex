defmodule Console.AI.Tools.Workbench.Integration.Http do
  @moduledoc false

  @spec error(String.t(), term()) :: {:error, String.t()}
  def error(service, %HTTPoison.Error{reason: reason}),
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
