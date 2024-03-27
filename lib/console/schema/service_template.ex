defmodule Console.Schema.ServiceTemplate do
  use Piazza.Ecto.Schema
  alias Console.Schema.{GitRepository, Service, Metadata}

  schema "service_templates" do
    field :name,          :string
    field :namespace,     :string
    field :templated,     :boolean, default: true
    field :contexts,      {:array, :string}

    embeds_one :git,  Service.Git,  on_replace: :update
    embeds_one :helm, Service.Helm, on_replace: :update

    embeds_one :kustomize, Kustomize, on_replace: :update do
      field :path, :string
    end

    embeds_one :sync_config, SyncConfig, on_replace: :update do
      embeds_one :namespace_metadata, Metadata
      field :create_namespace, :boolean, default: true
    end

    belongs_to :repository, GitRepository

    timestamps()
  end


  def attributes(%__MODULE__{} = tpl) do
    Map.new(__schema__(:fields) -- [:id], & {&1, Map.get(tpl, &1) |> Console.mapify()})
    |> Console.remove_ids()
    |> Map.put(:context_bindings, Enum.map(tpl.contexts || [], & %{context_id: &1}))
  end

  def attributes(%__MODULE__{} = tpl, namespace, name) do
    attributes(tpl)
    |> Map.put(:namespace, namespace)
    |> Map.put(:name, name)
  end

  @valid ~w(name namespace templated repository_id contexts)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> foreign_key_constraint(:repository_id)
    |> cast_embed(:git)
    |> cast_embed(:helm)
    |> cast_embed(:kustomize, with: &Service.kustomize_changeset/2)
    |> cast_embed(:sync_config, with: &Service.sync_config_changeset/2)
  end
end
