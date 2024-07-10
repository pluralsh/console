defmodule Console.Schema.PrAutomation do
  use Piazza.Ecto.Schema
  alias Console.Schema.{Cluster, Service, ScmConnection, PolicyBinding, Configuration, GitRepository}

  defenum MatchStrategy, any: 0, all: 1, recursive: 2
  defenum Role, cluster: 0, service: 1, pipeline: 2, update: 3, upgrade: 4

  schema "pr_automations" do
    field :identifier,       :string
    field :name,             :string
    field :role,             Role
    field :documentation,    :binary
    field :addon,            :string
    field :title,            :string
    field :message,          :binary
    field :branch,           :string
    field :write_policy_id,  :binary_id
    field :create_policy_id, :binary_id

    embeds_one :creates, CreateSpec, on_replace: :update do
      embeds_one :git, Service.Git, on_replace: :update

      embeds_many :templates, TemplateSpec, on_replace: :delete do
        field :source,      :string
        field :destination, :string
        field :external,    :boolean
      end
    end

    embeds_one :updates, UpdateSpec, on_replace: :update do
      field :regexes,          {:array, :string}
      field :files,            {:array, :string}
      field :replace_template, :string
      field :yq,               :string
      field :match_strategy,   MatchStrategy

      embeds_many :regex_replacements, RegexReplacement, on_replace: :delete do
        field :regex,       :string
        field :replacement, :string
        field :file,        :string
        field :templated,   :boolean, default: true
      end
    end

    embeds_one :deletes, DeleteSpec, on_replace: :update do
      field :files,   {:array, :string}
      field :folders, {:array, :string}
    end

    embeds_many :configuration, Configuration, on_replace: :delete

    belongs_to :cluster,    Cluster
    belongs_to :service,    Service
    belongs_to :connection, ScmConnection
    belongs_to :repository, GitRepository

    has_many :write_bindings, PolicyBinding,
      on_replace: :delete,
      foreign_key: :policy_id,
      references: :write_policy_id

    has_many :create_bindings, PolicyBinding,
      on_replace: :delete,
      foreign_key: :policy_id,
      references: :create_policy_id

    timestamps()
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :name]) do
    from(p in query, order_by: ^order)
  end

  @valid ~w(name role identifier message title branch documentation addon repository_id cluster_id service_id connection_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:updates, with: &update_changeset/2)
    |> cast_embed(:creates, with: &create_changeset/2)
    |> cast_embed(:deletes, with: &delete_changeset/2)
    |> cast_embed(:configuration)
    |> cast_assoc(:write_bindings)
    |> cast_assoc(:create_bindings)
    |> put_new_change(:write_policy_id, &Ecto.UUID.generate/0)
    |> put_new_change(:create_policy_id, &Ecto.UUID.generate/0)
    |> validate_required([:name, :title, :message, :connection_id])
    |> unique_constraint(:name)
    |> foreign_key_constraint(:cluster_id)
    |> foreign_key_constraint(:service_id)
    |> foreign_key_constraint(:connection_id)
  end

  defp update_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(regexes files yq replace_template match_strategy)a)
    |> cast_embed(:regex_replacements, with: &regex_replacement_cs/2)
  end

  defp create_changeset(model, attrs) do
    model
    |> cast(attrs, [])
    |> cast_embed(:git)
    |> cast_embed(:templates, with: &template_changeset/2)
  end

  defp delete_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(files folders)a)
  end

  defp template_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(source destination external)a)
    |> validate_required(~w(source destination)a)
  end

  defp regex_replacement_cs(model, attrs) do
    cast(model, attrs, ~w(regex replacement file templated)a)
  end
end
