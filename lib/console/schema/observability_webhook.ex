defmodule Console.Schema.ObservabilityWebhook do
  use Console.Schema.Base
  alias Console.Deployments.Policies.Rbac
  alias Console.Schema.{PolicyBinding, User}

  defenum Type, grafana: 0, datadog: 1, pagerduty: 2, newrelic: 3, sentry: 4, plural: 5, alertops: 6

  schema "observability_webhooks" do
    field :type,        Type
    field :name,        :string
    field :secret,      Piazza.Ecto.EncryptedString
    field :external_id, :string

    field :read_policy_id, :binary_id
    field :write_policy_id, :binary_id

    has_many :read_bindings, PolicyBinding,
      on_replace: :delete,
      foreign_key: :policy_id,
      references: :read_policy_id
    has_many :write_bindings, PolicyBinding,
      on_replace: :delete,
      foreign_key: :policy_id,
      references: :write_policy_id

    timestamps()
  end

  def url(%__MODULE__{external_id: ext_id, type: t}),
    do: Console.Deployments.Notifications.webhook_url("/v1/webhooks/observability/#{t}/#{ext_id}")

  def ordered(query \\ __MODULE__, order \\ [asc: :inserted_at]) do
    from(w in query, order_by: ^order)
  end

  def for_user(query \\ __MODULE__, %User{} = user) do
    Rbac.globally_readable(query, user, fn query, id, groups ->
      from(w in query,
        left_join: b in PolicyBinding,
        on: b.policy_id == w.read_policy_id or b.policy_id == w.write_policy_id,
        where: b.user_id == ^id or b.group_id in ^groups,
        distinct: true
      )
    end)
  end

  @valid ~w(type name secret external_id read_policy_id write_policy_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_assoc(:read_bindings)
    |> cast_assoc(:write_bindings)
    |> put_new_change(:external_id, fn -> Console.rand_alphanum(30) end)
    |> put_new_change(:secret, fn -> Console.rand_str(32) end)
    |> put_new_change(:read_policy_id, &Ecto.UUID.generate/0)
    |> put_new_change(:write_policy_id, &Ecto.UUID.generate/0)
    |> validate_required(~w(type name secret external_id)a)
  end
end
