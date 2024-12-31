defmodule Console.GraphQl.Resolvers.Plural do
  use Nebulex.Caching
  alias Kube.Client

  def account(_, _), do: {:ok, Console.Features.account()}

  def list_applications(_, _) do
    case Client.list_applications() do
      {:ok, %{items: items}} -> {:ok, items}
      _ -> {:ok, []}
    end
  end

  def resolve_application(%{name: name}, _), do: Client.get_application(name)

  def resolve_context(_, _) do
    with {:ok, %{configuration: conf}} <- Console.Plural.Context.get() do
      confs = Enum.map(conf, fn {k, map} -> %{repository: k, context: map} end)
      {:ok, confs}
    end
  end

  def resolve_plural_context(_, _), do: Console.Plural.Context.get()

  def info(%{metadata: %{name: name}}, _, _), do: Console.Commands.Plural.info(name)
end
