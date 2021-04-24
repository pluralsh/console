defmodule Console.Services.Webhooks do
  use Console.Services.Base
  alias Console.Schema.Webhook
  alias Console.Webhooks.Formatter

  @headers [
    {"content-type", "application/json"},
    {"accept", "application/json"}
  ]

  def create(attrs) do
    %Webhook{type: :slack, health: :healthy}
    |> Webhook.changeset(attrs)
    |> Console.Repo.insert()
  end

  def deliver(build, %Webhook{url: url, type: type} = wh) do
    formatter = formatter(type)

    with {:ok, payload} <- formatter.format(build) do
      HTTPoison.post(url, Jason.encode!(payload), @headers)
      |> mark_webhook(wh)
    end
  end

  defp mark_webhook({:ok, _}, wh), do: set_health(wh, :healthy)
  defp mark_webhook(_, wh), do: set_health(wh, :unhealthy)

  defp set_health(%Webhook{} = wh, health) do
    wh
    |> Webhook.changeset(%{health: health})
    |> Console.Repo.update()
  end

  defp formatter(:piazza), do: Formatter.Piazza
  defp formatter(:slack), do: Formatter.Slack
end
