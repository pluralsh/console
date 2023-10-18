defmodule Console.Middleware.ErrorHandler do
  import Console.GraphQl.Helpers
  require Logger
  @behaviour Absinthe.Middleware

  @impl true
  def call(%{errors: [_ | _] = errors} = resolution, _config) do
    %{ resolution | errors: Enum.map(errors, &format/1) }
  end
  def call(res, _), do: res

  defp format(%Ecto.Changeset{} = cs), do: resolve_changeset(cs)
  defp format(%{"message" => msg}), do: msg
  defp format({:http_error, _, %{"message" => msg}}), do: msg
  defp format({:http_error, _, err}) when is_binary(err), do: err
  defp format(err) when is_binary(err), do: err
  defp format(err) do
    Logger.error "found unknown error: #{inspect(err)}"
    "unknown error"
  end
end
