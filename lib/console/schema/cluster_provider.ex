defmodule Console.Schema.ClusterProvider do
  use Piazza.Ecto.Schema
  import Console.Deployments.Ecto.Validations
  alias Console.Deployments.Policies.Rbac
  alias Console.Schema.{Service, GitRepository, PolicyBinding, User}

  defmodule CloudSettings do
    use Piazza.Ecto.Schema
    alias Piazza.Ecto.EncryptedString

    embedded_schema do
      embeds_one :aws, Aws, on_replace: :update do
        field :access_key_id,     :string
        field :secret_access_key, EncryptedString
      end

      embeds_one :gcp, Gcp, on_replace: :update do
        field :application_credentials, EncryptedString
      end

      field :context, :map
    end

    def changeset(model, attrs \\ %{}) do
      model
      |> cast(attrs, ~w(context)a)
      |> cast_embed(:aws, with: &aws_changeset/2)
      |> cast_embed(:gcp, with: &gcp_changeset/2)
    end

    def aws_changeset(model, attrs \\ %{}) do
      model
      |> cast(attrs, ~w(access_key_id secret_access_key)a)
      |> validate_required(~w(access_key_id secret_access_key)a)
    end

    def gcp_changeset(model, attrs \\ %{}) do
      model
      |> cast(attrs, ~w(application_credentials)a)
      |> validate_required(~w(application_credentials)a)
    end
  end

  schema "cluster_providers" do
    field :name,            :string
    field :namespace,       :string
    field :cloud,           :string
    field :self,            :boolean
    field :write_policy_id, :binary_id
    field :read_policy_id,  :binary_id

    embeds_one :cloud_settings, CloudSettings, on_replace: :update
    embeds_one :git, Service.Git, on_replace: :update

    has_many :read_bindings, PolicyBinding,
      on_replace: :delete,
      foreign_key: :policy_id,
      references: :read_policy_id
    has_many :write_bindings, PolicyBinding,
      on_replace: :delete,
      foreign_key: :policy_id,
      references: :write_policy_id

    belongs_to :repository, GitRepository
    belongs_to :service, Service

    timestamps()
  end

  def for_service(query \\ __MODULE__, service_id) do
    from(c in query, where: c.service_id == ^service_id)
  end

  def for_user(query \\ __MODULE__, %User{} = user) do
    Rbac.globally_readable(query, user, fn query, id, groups ->
      from(p in query,
        left_join: b in PolicyBinding,
          on: b.policy_id == p.read_policy_id or b.policy_id == p.write_policy_id,
        where: b.user_id == ^id or b.group_id in ^groups,
        distinct: true
      )
    end)
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :name]) do
    from(p in query, order_by: ^order)
  end

  @valid ~w(name namespace cloud repository_id service_id self)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> kubernetes_names([:name, :namespace])
    |> cast_embed(:git)
    |> cast_embed(:cloud_settings)
    |> cast_assoc(:read_bindings)
    |> cast_assoc(:write_bindings)
    |> put_new_change(:write_policy_id, &Ecto.UUID.generate/0)
    |> put_new_change(:read_policy_id, &Ecto.UUID.generate/0)
    |> foreign_key_constraint(:service_id)
    |> foreign_key_constraint(:repository_id)
    |> unique_constraint(:name)
    |> backfill_namespace()
    |> backfill_cloud()
    |> backfill_git()
    |> validate_required([:name, :namespace])
  end

  def update_changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, [])
    |> cast_embed(:cloud_settings)
  end

  def rbac_changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, [])
    |> cast_assoc(:read_bindings)
    |> cast_assoc(:write_bindings)
  end

  defp backfill_namespace(cs) do
    name = get_field(cs, :name)
    put_new_change(cs, :namespace, fn -> "plrl-capi-#{name}" end)
  end

  defp backfill_cloud(cs) do
    name = get_field(cs, :name)
    cond do
      String.contains?(name, "aws") ->
        put_new_change(cs, :cloud, fn -> "aws" end)
      String.contains?(name, "gcp") ->
        put_new_change(cs, :cloud, fn -> "gcp" end)
      String.contains?(name, "azure") ->
        put_new_change(cs, :cloud, fn -> "azure" end)
      true -> cs
    end
  end

  defp backfill_git(cs) do
    cloud = get_field(cs, :cloud)
    put_new_change(cs, :git, fn -> %{ref: "main", folder: "capi/clusters/#{cloud}"} end)
  end
end
