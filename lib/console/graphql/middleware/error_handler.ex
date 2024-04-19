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
  defp format(%Tee{} = tee), do: Tee.output(tee)
  defp format(%{"message" => msg}), do: msg
  defp format({:http_error, _, %{"message" => msg}}), do: msg
  defp format({:http_error, _, err}) when is_binary(err), do: err
  defp format(err) when is_binary(err), do: err
  defp format(err) when is_atom(err), do: err
  defp format(err) do
    Logger.error "found unknown error: #{inspect(err)}"
    "unknown error"
  end

  defp flatten(vals, res \\ [])
  defp flatten([], res), do: res
  defp flatten([l | tail], res) when is_list(l), do: flatten(tail, res ++ l)
  defp flatten([h | tail], res), do: flatten(tail, [h | res])
  defp flatten(v, res), do: [v | res]
end
