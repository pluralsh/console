defmodule Console.Schema.ObservabilityWebhook do
  use Piazza.Ecto.Schema

  defenum Type, grafana: 0, datadog: 1, pagerduty: 2, newrelic: 3, sentry: 4

  schema "observability_webhooks" do
    field :type,        Type
    field :name,        :string
    field :secret,      Piazza.Ecto.EncryptedString
    field :external_id, :string

    timestamps()
  end

  def url(%__MODULE__{external_id: ext_id, type: t}),
    do: Console.Deployments.Notifications.webhook_url("/v1/webhooks/observability/#{t}/#{ext_id}")

  def ordered(query \\ __MODULE__, order \\ [asc: :inserted_at]) do
    from(w in query, order_by: ^order)
  end

  @valid ~w(type name secret external_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> put_new_change(:external_id, fn -> Console.rand_alphanum(30) end)
    |> put_new_change(:secret, fn -> Console.rand_str(32) end)
    |> validate_required(~w(type name secret external_id)a)
  end
end
