defmodule Console.Middleware.ErrorHandler do
  import Console.GraphQl.Helpers
  require Logger
  @behaviour Absinthe.Middleware

  @impl true
  def call(%{errors: [_ | _] = errors} = resolution, _config) do
    %{ resolution | errors: Enum.map(errors, &format/1) }
  end
  def call(res, _), do: res

  defp format({:error, %Ecto.Changeset{} = cs}), do: resolve_changeset(cs)
  defp format({:error, _, %{"message" => msg}}), do: {:error, msg}
  defp format({:error, {:http_error, _, %{"message" => msg}}}), do: {:error, msg}
  defp format({:error, {:http_error, _, err}}) when is_binary(err), do: {:error, err}
  defp format({:error, _} = err), do: err
  defp format({:error, _, _} = err) do
    Logger.error "found unknown error: #{inspect(err)}"
    {:error, "kubernetes error"}
  end
  defp format(error), do: error
end
