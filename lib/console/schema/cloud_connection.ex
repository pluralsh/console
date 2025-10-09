defmodule Console.Schema.CloudConnection do
  use Piazza.Ecto.Schema
  alias Piazza.Ecto.EncryptedString
  alias Console.Deployments.Policies.Rbac
  alias Console.Schema.{User, PolicyBinding}

  defenum Provider, aws: 0, gcp: 1, azure: 2

  schema "cloud_connections" do
    field :provider, Provider
    field :name,     :string
    field :read_policy_id, :binary_id

    embeds_one :configuration, Configuration, on_replace: :update do
      embeds_one :aws, Aws, on_replace: :update do
        field :region,            :string
        field :regions,           {:array, :string}
        field :access_key_id,     :string
        field :secret_access_key, EncryptedString
      end

      embeds_one :gcp, Gcp, on_replace: :update do
        field :service_account_key, EncryptedString
        field :project_id, :string
      end

      embeds_one :azure, Azure, on_replace: :update do
        field :subscription_id, :string
        field :tenant_id,       :string
        field :client_id,       :string
        field :client_secret,   EncryptedString
      end
    end

    has_many :read_bindings, PolicyBinding,
      on_replace: :delete,
      foreign_key: :policy_id,
      references: :read_policy_id

    timestamps()
  end

  def for_user(query \\ __MODULE__, %User{} = user) do
    Rbac.globally_readable(query, user, fn query, id, groups ->
      from(c in query,
        left_join: b in PolicyBinding,
          on: b.policy_id == c.read_policy_id,
        where: b.user_id == ^id or b.group_id in ^groups
      )
    end)
  end

  def search(query \\ __MODULE__, q) do
    from(c in query, where: ilike(c.name, ^"%#{q}%"))
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :name]) do
    from(c in query, order_by: ^order)
  end

  def changeset(model, attrs) do
    model
    |> cast(attrs, [:provider, :name])
    |> validate_length(:name, max: 255)
    |> cast_assoc(:read_bindings)
    |> cast_embed(:configuration, with: &configuration_changeset/2)
    |> put_new_change(:read_policy_id, &Ecto.UUID.generate/0)
    |> validate_required([:provider, :name])
  end

  defp configuration_changeset(model, attrs) do
    model
    |> cast(attrs, [])
    |> cast_embed(:aws, with: &aws_changeset/2)
    |> cast_embed(:gcp, with: &gcp_changeset/2)
    |> cast_embed(:azure, with: &azure_changeset/2)
  end

  defp aws_changeset(model, attrs) do
    model
    |> cast(attrs, [:region, :regions, :access_key_id, :secret_access_key])
    |> validate_required([:access_key_id, :secret_access_key])
  end

  defp gcp_changeset(model, attrs) do
    model
    |> cast(attrs, [:service_account_key, :project_id])
    |> validate_required([:service_account_key, :project_id])
  end

  defp azure_changeset(model, attrs) do
    model
    |> cast(attrs, [:subscription_id, :tenant_id, :client_id, :client_secret])
    |> validate_required([:subscription_id, :tenant_id, :client_id, :client_secret])
  end
end
