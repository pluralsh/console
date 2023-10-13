defmodule Console.Middleware.ErrorHandler do
  import Console.GraphQl.Helpers
  @behaviour Absinthe.Middleware

  @impl true
  def call(%{errors: [_ | _] = errors} = resolution, _config) do
    %{ resolution | errors: Enum.map(errors, &format/1) }
  end
  def call(res, _), do: res

  defp format({:error, %Ecto.Changeset{} = cs}), do: resolve_changeset(cs)
  defp format({:error, _, %{"message" => msg}}), do: {:error, msg}
  defp format({:error, {:http_error, _, %{"message" => msg}}}), do: {:error, msg}
  defp format({:error, _, _}), do: {:error, "kubernetes error"}
  defp format(error), do: error
end
