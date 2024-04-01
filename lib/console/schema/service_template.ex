defmodule Console.Schema.ServiceTemplate do
  use Piazza.Ecto.Schema
  alias Console.Schema.{GitRepository, Service, Metadata, Revision}

  schema "service_templates" do
    field :name,          :string
    field :namespace,     :string
    field :templated,     :boolean, default: true
    field :contexts,      {:array, :string}
    field :configuration, {:array, :map}, virtual: true

    embeds_one :git,  Service.Git,  on_replace: :update
    embeds_one :helm, Service.Helm, on_replace: :update

    embeds_one :kustomize, Kustomize, on_replace: :update do
      field :path, :string
    end

    embeds_one :sync_config, SyncConfig, on_replace: :update do
      embeds_one :namespace_metadata, Metadata
      field :create_namespace, :boolean, default: true
    end

    belongs_to :revision,   Revision
    belongs_to :repository, GitRepository

    timestamps()
  end


  def attributes(%__MODULE__{} = tpl) do
    tpl = load_configuration(tpl)

    Map.new(__schema__(:fields) -- [:id], & {&1, Map.get(tpl, &1) |> Console.mapify()})
    |> Console.remove_ids()
    |> Map.put(:context_bindings, Enum.map(tpl.contexts || [], & %{context_id: &1}))
    |> Map.drop(~w(updated_at inserted_at revision_id id)a)
  end

  def attributes(%__MODULE__{} = tpl, namespace, name) do
    tpl = load_configuration(tpl)

    attributes(tpl)
    |> Map.put(:namespace, namespace)
    |> Map.put(:name, name)
  end

  def load_configuration(%__MODULE__{configuration: conf} = tpl) when is_list(conf), do: tpl
  def load_configuration(tpl) do
    case Console.Deployments.Global.configuration(tpl) do
      {:ok, secrets} ->
        secrets = Enum.map(secrets, fn {k, v} -> %{name: k, value: v} end)
        Map.put(tpl, :configuration, secrets)
      _ -> Map.put(tpl, :configuration, [])
    end
  end

  @valid ~w(name namespace templated repository_id contexts revision_id)a

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
