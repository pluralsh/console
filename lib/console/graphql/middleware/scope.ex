defmodule Console.Middleware.Scope do
  @behaviour Absinthe.Middleware
  alias Console.Schema.User

  def call(%{context: %{current_user: %User{scopes: [_ | _]}}} = res, opts) do
    api      = Keyword.get(opts, :api)
    resource = Keyword.get(opts, :resource)
    action   = Keyword.get(opts, :action)

    scopes = generate_scopes(resource, action)
    put_in(res.context.current_user.api, add_scopes(scopes, api))
  end
  def call(res, _), do: res

  defp generate_scopes(resource, :write), do: ~w(#{resource}.write)
  defp generate_scopes(resource, :read), do: ~w(#{resource}.read #{resource}.write)
  defp generate_scopes(resource, scope) when not is_nil(scope), do: ~w(#{resource}.#{scope})
  defp generate_scopes(_, _), do: []

  defp add_scopes(scopes, api) when is_binary(api), do: [api | scopes]
  defp add_scopes(scopes, apis) when is_list(apis), do: apis ++ scopes
  defp add_scopes(scopes, _), do: scopes
end
