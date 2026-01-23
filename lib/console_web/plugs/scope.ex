defmodule ConsoleWeb.Plugs.Scope do
  alias Console.Schema.User

  def init(opts), do: opts

  def call(conn, opts) do
    case Console.Guardian.Plug.current_resource(conn) do
      %User{scopes: [_ | _]} = current_user ->
        api      = Keyword.get(opts, :api)
        resource = Keyword.get(opts, :resource)
        action   = Keyword.get(opts, :action)

        scopes = generate_scopes(resource, action)
        Map.put(current_user, :api, add_scopes(scopes, api))
        |> then(&Console.Guardian.Plug.put_current_resource(conn, &1))
      _ -> conn
    end
  end

  defp generate_scopes(resource, :write), do: ~w(#{resource}.write)
  defp generate_scopes(resource, :read), do: ~w(#{resource}.read #{resource}.write)
  defp generate_scopes(resource, scope) when not is_nil(scope), do: ~w(#{resource}.#{scope})
  defp generate_scopes(_, _), do: []

  defp add_scopes(scopes, api) when is_binary(api), do: [api | scopes]
  defp add_scopes(scopes, apis) when is_list(apis), do: apis ++ scopes
  defp add_scopes(scopes, _), do: scopes
end
