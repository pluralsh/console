defmodule Console.GraphQl.Resolvers.Webhook do
  use Console.GraphQl.Resolvers.Base, model: Console.Schema.Webhook
  alias Console.Services.Webhooks

  def list_webhooks(args, _) do
    Webhook
    |> Webhook.ordered(asc: :url)
    |> paginate(args)
  end

  def create_webhook(%{attributes: attrs}, _),
    do: Webhooks.create(attrs)

  def delete_webhook(%{id: id}, _),
    do: Webhooks.delete(id)
end
