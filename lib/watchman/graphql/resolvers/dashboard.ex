defmodule Watchman.GraphQl.Resolvers.Dashboard do
  alias Watchman.Kube.Client

  def resolve_dashboards(%{repo: name}, _) do
    with {:ok, %{items: items}} <- Client.list_dashboards(name) do
      {:ok, items}
      |> IO.inspect()
    end
  end

  def resolve_dashboard(%{repo: name, name: id}, _), do: Client.get_dashboard(name, id)
end