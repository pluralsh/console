defmodule Console.Middleware.Scope do
  @behaviour Absinthe.Middleware
  alias Console.Schema.User

  @dummy "!!invalid!!"

  def call(%{context: %{current_user: %User{scopes: [_ | _]} = user}} = res, opts) do
    api = Keyword.get(opts, :api)
    put_in(res.context.current_user.api, api)
  end
  def call(res, _), do: res
end
