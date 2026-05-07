defmodule Console.Schema.IssueWebhook do
  use Console.Schema.Base
  alias Console.Deployments.Policies.Rbac
  alias Console.Schema.{PolicyBinding, User}

  defenum Provider, linear: 0, jira: 1, asana: 2, github: 3, gitlab: 4, azure_devops: 5, bitbucket: 6, bitbucket_datacenter: 7

  schema "issue_webhooks" do
    field :provider,    Provider
    field :external_id, :string
    field :name,        :string
    field :secret,      Piazza.Ecto.EncryptedString

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

  def url(%__MODULE__{external_id: ext_id, provider: p}),
    do: Console.Deployments.Notifications.webhook_url("/v1/webhooks/issues/#{p}/#{ext_id}")

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

  @valid ~w(provider name secret read_policy_id write_policy_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_assoc(:read_bindings)
    |> cast_assoc(:write_bindings)
    |> put_new_change(:read_policy_id, &Ecto.UUID.generate/0)
    |> put_new_change(:write_policy_id, &Ecto.UUID.generate/0)
    |> put_new_change(:external_id, &gen_external_id/0)
    |> validate_required([:provider, :name, :secret])
    |> unique_constraint(:url)
    |> unique_constraint(:name)
    |> unique_constraint(:external_id)
  end

  defp gen_external_id() do
    :crypto.strong_rand_bytes(32)
    |> Base.url_encode64()
    |> String.replace("/", "")
  end
end
