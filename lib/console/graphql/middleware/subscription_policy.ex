defmodule Console.Middleware.SubscriptionPolicy do
  @moduledoc """
  Authorizes a subscription payload against each subscriber at delivery time.

  Absinthe re-runs every subscriber's document with that subscriber's context, but publishes whatever
  comes out, errors included.  Denied subscribers are flagged with `skip_delivery` instead, and
  `ConsoleWeb.Subscriptions.run_docset/3` drops the event for their socket.

  This runs once per subscriber per event, so the payload and the socket's user must both already be
  preloaded for the policy check to stay in memory.
  """
  @behaviour Absinthe.Middleware
  alias Console.Schema.User

  @flag :skip_delivery

  def call(%{source: %{payload: payload} = source, context: %{current_user: %User{} = user}} = res, opts) do
    policy = Keyword.fetch!(opts, :policy)
    case policy.allow(payload, user, Keyword.get(opts, :action, :read)) do
      {:ok, _} -> Absinthe.Resolution.put_result(res, {:ok, source})
      _ -> skip(res)
    end
  end
  def call(res, _), do: skip(res)

  @doc """
  Whether a finished subscription document was marked undeliverable for its subscriber
  """
  @spec skip?(Absinthe.Blueprint.t) :: boolean
  def skip?(%{execution: %{context: %{@flag => true}}}), do: true
  def skip?(_), do: false

  defp skip(%{context: ctx} = res) do
    %{res | context: Map.put(ctx, @flag, true)}
    |> Absinthe.Resolution.put_result({:ok, nil})
  end
end
