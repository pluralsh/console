defmodule Console.Middleware.CheckComponent do
  @behaviour Absinthe.Middleware
  alias Console.Deployments.{Services}
  alias Console.Schema.{Service}

  def call(%{value: %{api_version: _} = value, context: %{service: %Service{} = svc}} = res, _opts) do
    case Services.accessible(svc, value) do
      {:ok, _} -> res
      err -> Absinthe.Resolution.put_result(res, err)
    end
  end
  def call(res, _), do: res
end
