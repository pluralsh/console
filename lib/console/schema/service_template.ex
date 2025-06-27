defmodule Console.Schema.ServiceTemplate do
  use Piazza.Ecto.Schema
  alias Console.Schema.{GitRepository, Service, Revision, ServiceDependency}

  schema "service_templates" do
    field :name,              :string
    field :namespace,         :string
    field :templated,         :boolean, default: true
    field :protect,           :boolean, default: false
    field :contexts,          {:array, :string}
    field :configuration,     {:array, :map}, virtual: true
    field :ignore_sync,       :boolean, virtual: true
    field :loaded,            :boolean, virtual: true, default: false
    field :prev_contexts,     {:array, :string}, virtual: true
    field :inferred_contexts, {:array, :string}, virtual: true

    embeds_many :sources, Service.Source, on_replace: :delete
    embeds_many :renderers, Service.Renderer, on_replace: :delete

    embeds_one :git,         Service.Git,        on_replace: :update
    embeds_one :helm,        Service.Helm,       on_replace: :update
    embeds_one :kustomize,   Service.Kustomize,  on_replace: :update
    embeds_one :sync_config, Service.SyncConfig, on_replace: :update

    has_many :dependencies, ServiceDependency,
      foreign_key: :template_id,
      on_replace: :delete

    belongs_to :revision,   Revision
    belongs_to :repository, GitRepository

    timestamps()
  end


  def attributes(%__MODULE__{} = tpl) do
    tpl = load_configuration(tpl)

    Map.new([:configuration | __schema__(:fields)] -- [:id], & {&1, Map.get(tpl, &1) |> Console.mapify()})
    |> Console.remove_ids()
    |> Map.put(:context_bindings, Enum.map(tpl.inferred_contexts || [], & %{context_id: &1}))
    |> Map.drop(~w(updated_at inserted_at revision_id id)a)
  end

  def attributes(%__MODULE__{} = tpl, namespace, name) do
    tpl = load_configuration(tpl)

    attributes(tpl)
    |> Map.put(:namespace, namespace)
    |> Map.put(:name, name)
  end

  def load_configuration(%__MODULE__{loaded: true} = tpl), do: tpl
  def load_configuration(tpl) do
    case Console.Deployments.Global.configuration(tpl) do
      {:ok, secrets} ->
        secrets = Enum.map(secrets, fn {k, v} -> %{name: k, value: v} end)
        Map.put(tpl, :configuration, secrets)
      _ -> Map.put(tpl, :configuration, [])
    end
    |> Map.put(:loaded, true)
  end

  def load_contexts(%{contexts: names, prev_contexts: names} = tpl), do: tpl
  def load_contexts(%{contexts: [_ | _] = names} = tpl) do
    ctxs = Console.Deployments.Global.fetch_contexts(names)
    Map.put(tpl, :inferred_contexts, Enum.map(ctxs, & &1.id))
    |> Map.put(:prev_contexts, names)
  end
  def load_contexts(tpl), do: %{tpl | inferred_contexts: [], prev_contexts: []}

  @valid ~w(name protect namespace templated repository_id contexts revision_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:git)
    |> cast_embed(:helm)
    |> cast_embed(:sources)
    |> cast_embed(:renderers)
    |> cast_assoc(:dependencies)
    |> foreign_key_constraint(:repository_id)
    |> cast_embed(:kustomize, with: &Service.kustomize_changeset/2)
    |> cast_embed(:sync_config, with: &Service.sync_config_changeset/2)
  end
end
