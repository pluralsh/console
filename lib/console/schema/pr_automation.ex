defmodule Console.Schema.PrAutomation do
  use Piazza.Ecto.Schema
  alias Console.Schema.{
    Cluster,
    Service,
    ScmConnection,
    PolicyBinding,
    Configuration,
    Project,
    GitRepository,
    Catalog,
    PrGovernance
  }

  defenum MatchStrategy, any: 0, all: 1, recursive: 2
  defenum Role, cluster: 0, service: 1, pipeline: 2, update: 3, upgrade: 4, cost: 5
  defenum ListMerge, overwrite: 0, append: 1

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
    field :patch,            :boolean, default: false
    field :icon,             :string
    field :dark_icon,        :string
    field :branch_prefix,    :string
    field :labels,           {:array, :string}

    embeds_one :creates, CreateSpec, on_replace: :update do
      embeds_one :git, Service.Git, on_replace: :update

      embeds_many :templates, TemplateSpec, on_replace: :delete do
        field :source,      :string
        field :destination, :string
        field :external,    :boolean
        field :context,     :map
        field :condition,   :string
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

      embeds_many :yaml_overlays, YamlOverlay, on_replace: :delete do
        field :file,       :string
        field :yaml,       :string
        field :templated,  :boolean,  default: true
        field :list_merge, ListMerge, default: :append
      end
    end

    embeds_one :deletes, DeleteSpec, on_replace: :update do
      field :files,   {:array, :string}
      field :folders, {:array, :string}
    end

    embeds_one :confirmation, Confirmation, on_replace: :update do
      field :text, :string
      embeds_many :checklist, Checklist, on_replace: :delete do
        field :label, :string
      end
    end

    embeds_one :secrets, Secrets, on_replace: :update do
      field :cluster, :string
      field :namespace, :string
      field :name, :string

      embeds_many :entries, SecretEntry, on_replace: :delete do
        field :name,          :string
        field :documentation, :string
        field :autogenerate,  :boolean, default: false
      end
    end

    embeds_many :configuration, Configuration, on_replace: :delete

    belongs_to :cluster,    Cluster
    belongs_to :service,    Service
    belongs_to :connection, ScmConnection
    belongs_to :repository, GitRepository
    belongs_to :project,    Project
    belongs_to :catalog,    Catalog
    belongs_to :governance, PrGovernance

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

  def for_catalog(query \\ __MODULE__, catalog_id) do
    from(p in query, where: p.catalog_id == ^catalog_id)
  end

  def for_catalog_name(query \\ __MODULE__, name) do
    from(p in query,
      join: c in assoc(p, :catalog),
      where: c.name == ^name
    )
  end

  def search(query \\ __MODULE__, q) do
    from(p in query, where: ilike(p.name, ^"%#{q}%"))
  end

  def for_project(query \\ __MODULE__, proj_id) do
    from(p in query, where: p.project_id == ^proj_id)
  end

  def for_role(query \\ __MODULE__, role) do
    from(p in query, where: p.role == ^role)
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :name]) do
    from(p in query, order_by: ^order)
  end

  @valid ~w(name
            project_id
            icon
            dark_icon
            role
            patch
            branch_prefix
            identifier
            message
            title
            branch
            documentation
            addon
            catalog_id
            repository_id
            cluster_id
            service_id
            connection_id
            labels
            governance_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> validate_length(:name, max: 255)
    |> cast_embed(:updates, with: &update_changeset/2)
    |> cast_embed(:creates, with: &create_changeset/2)
    |> cast_embed(:deletes, with: &delete_changeset/2)
    |> cast_embed(:confirmation, with: &confirmation_changeset/2)
    |> cast_embed(:secrets, with: &secret_changeset/2)
    |> cast_embed(:configuration)
    |> cast_assoc(:write_bindings)
    |> cast_assoc(:create_bindings)
    |> put_new_change(:write_policy_id, &Ecto.UUID.generate/0)
    |> put_new_change(:create_policy_id, &Ecto.UUID.generate/0)
    |> unique_constraint(:name)
    |> foreign_key_constraint(:promotion_criteria,
      name: :promotion_criteria,
      match: :prefix,
      message: "Cannot delete due to a pipeline requiring this pr automation"
    )
    |> foreign_key_constraint(:cluster_id)
    |> foreign_key_constraint(:service_id)
    |> foreign_key_constraint(:connection_id)
    |> foreign_key_constraint(:project_id)
    |> foreign_key_constraint(:catalog_id)
    |> validate_required([:name, :title, :message, :connection_id])
  end

  defp update_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(regexes files yq replace_template match_strategy)a)
    |> cast_embed(:regex_replacements, with: &regex_replacement_cs/2)
    |> cast_embed(:yaml_overlays, with: &yaml_overlay_cs/2)
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
    |> cast(attrs, ~w(source destination external context condition)a)
    |> validate_required(~w(source destination)a)
  end

  defp regex_replacement_cs(model, attrs) do
    cast(model, attrs, ~w(regex replacement file templated)a)
  end

  defp yaml_overlay_cs(model, attrs) do
    cast(model, attrs, ~w(yaml file templated list_merge)a)
  end

  defp confirmation_changeset(model, attrs) do
    model
    |> cast(attrs, [:text])
    |> cast_embed(:checklist, with: &checklist_changeset/2)
  end

  defp checklist_changeset(model, attrs) do
    model
    |> cast(attrs, [:label])
    |> validate_required([:label])
  end

  defp secret_changeset(model, attrs) do
    model
    |> cast(attrs, [:cluster, :namespace, :name])
    |> cast_embed(:entries, with: &secret_entry_changeset/2)
    |> validate_required([:cluster, :namespace, :name])
  end

  defp secret_entry_changeset(model, attrs) do
    model
    |> cast(attrs, [:name, :documentation, :autogenerate])
    |> validate_required([:name, :documentation])
  end
end

defmodule Console.Schema.PrAutomation.Mini do
  alias Console.Schema.PrAutomation

  @derive Jason.Encoder
  @derive JSON.Encoder
  defstruct [:id, :name, :documentation, :title, :message, :branch, :branch_prefix, :icon, :dark_icon]

  def new(%PrAutomation{} = pr) do
    %__MODULE__{
      id: pr.id,
      name: pr.name,
      documentation: pr.documentation,
      title: pr.title,
      message: pr.message,
      branch: pr.branch,
      branch_prefix: pr.branch_prefix,
      icon: pr.icon,
      dark_icon: pr.dark_icon
    }
  end

  def new(%{} = attrs) do
    %__MODULE__{
      id: attrs["id"],
      name: attrs["name"],
      documentation: attrs["documentation"],
      title: attrs["title"],
      message: attrs["message"],
      branch: attrs["branch"],
      branch_prefix: attrs["branch_prefix"],
      icon: attrs["icon"],
      dark_icon: attrs["dark_icon"]
    }
  end
end
