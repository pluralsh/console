defmodule Console.GraphQl.Resolvers.Deployments.Integration do
  use Console.GraphQl.Resolvers.Deployments.Base
  alias Console.Schema.ChatConnection
  alias Console.Deployments.Integrations

  def chat_connections(args, _) do
    ChatConnection.ordered()
    |> maybe_search(ChatConnection, args)
    |> chat_filters(args)
    |> paginate(args)
  end

  def chat_connection(%{id: id}, _) when is_binary(id),
    do: {:ok, Integrations.get_chat_connection!(id)}
  def chat_connection(%{name: name}, _) when is_binary(name),
    do: {:ok, Integrations.get_chat_connection_by_name!(name)}
  def chat_connection(_, _), do: {:error, "Must specify either id or name"}

  def upsert_chat_connection(%{attributes: attrs}, %{context: %{current_user: user}}),
    do: Integrations.upsert_chat_connection(attrs, user)

  def delete_chat_connection(%{id: id}, %{context: %{current_user: user}}),
    do: Integrations.delete_chat_connection(id, user)

  defp chat_filters(query, args) do
    Enum.reduce(args, query, fn
      {:type, t}, q when not is_nil(t) -> ChatConnection.for_type(q, t)
      _, q -> q
    end)
  end
end
