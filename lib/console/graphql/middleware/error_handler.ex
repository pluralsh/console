defmodule Console.Middleware.ErrorHandler do
  import Console.GraphQl.Helpers
  alias Console.Commands.Tee
  require Logger
  @behaviour Absinthe.Middleware

  @impl true
  def call(%{errors: [_ | _] = errors} = resolution, _config) do
    %{ resolution | errors: Enum.map(errors, &format/1) |> flatten() }
  end
  def call(res, _), do: res

  defp format(%Ecto.Changeset{} = cs), do: resolve_changeset(cs)
  defp format(%GRPC.RPCError{message: message}) when is_binary(message), do: message
  defp format(%Tee{} = tee), do: Tee.output(tee)
  defp format(%HTTPoison.Error{reason: reason}), do: "upstream request failed: #{inspect(reason)}"
  defp format(%{__exception__: true} = exception), do: exception_message(exception)
  defp format(%{"message" => msg}) when is_binary(msg), do: msg
  defp format(%{message: msg}) when is_binary(msg), do: msg
  defp format({:http_error, _, %{"message" => msg}}) when is_binary(msg), do: msg
  defp format({:http_error, _, err}) when is_binary(err) and byte_size(err) > 0, do: err
  defp format({:http_error, code, _}), do: "upstream request failed with status #{code}"
  defp format({:error, reason}), do: format(reason)
  defp format(err) when is_binary(err), do: err
  defp format(err) when is_atom(err), do: err
  defp format(err) do
    Logger.error "found unknown error: #{inspect(err)}"
    "unknown error (check logs for more details)"
  end

  defp exception_message(exception) do
    case {Console.Middleware.SafeResolution.upstream?(exception), Console.GraphQl.Exception.error(exception)} do
      {true, {_, msg}} -> msg
      {_, {code, msg}} when code >= 500 ->
        Logger.error("resolver returned exception: #{Exception.format(:error, exception)}")
        msg
      {_, {_, msg}} -> msg
    end
  end

  defp flatten(vals, res \\ [])
  defp flatten([], res), do: res
  defp flatten([l | tail], res) when is_list(l), do: flatten(tail, res ++ l)
  defp flatten([h | tail], res), do: flatten(tail, [h | res])
  defp flatten(v, res), do: [v | res]
end
