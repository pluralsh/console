defmodule ConsoleWeb.ComponentController do
  @moduledoc """
  Bulk uploads of a service's live components from the deployment operator, with the same semantics as the
  `updateServiceComponents` mutation: top-level keys that are present, even if null, are applied.

  Services that don't exist or belong to another cluster mustn't respond with a 404, which the operator
  takes to mean this endpoint doesn't exist and falls back to GraphQL for good.
  """
  use ConsoleWeb, :controller
  import ConsoleWeb.Params, only: [permit: 2]
  alias Console.Deployments.Services
  alias ConsoleWeb.Plugs.Token

  action_fallback ConsoleWeb.FallbackController

  @child ~w(uid state parent_uid name namespace group version kind)a
  @component ~w(state synced group version kind namespace name uid)a ++ [
    content: ~w(desired live)a,
    children: @child
  ]
  @attrs [
    :revision_id,
    :sha,
    components: @component,
    errors: ~w(source message warning)a,
    metadata: ~w(images fqdns)a
  ]

  @doc """
  Replaces a service's components, posted as `{"components": [...], "revision_id": ..., "sha": ..., "errors": [...], "metadata": {...}}`.
  """
  def update(conn, %{"id" => id} = params) do
    with {:ok, cluster} <- Token.fetch_cluster(conn),
         {:ok, svc} <- Services.update_components(permit(params, @attrs), id, cluster),
      do: json(conn, %{id: svc.id})
  end
end
