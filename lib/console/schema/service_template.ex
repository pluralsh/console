defmodule Console.Schema.ServiceTemplate do
  use Piazza.Ecto.Schema
  alias Console.Schema.{GitRepository, Service}

  schema "service_templates" do
    field :templated,     :boolean, default: true
    field :contexts,      {:array, :string}

    embeds_one :git,  Service.Git,  on_replace: :update
    embeds_one :helm, Service.Helm, on_replace: :update

    embeds_one :kustomize, Kustomize, on_replace: :update do
      field :path, :string
    end

    belongs_to :repository, GitRepository

    timestamps()
  end

  @valid ~w(templated repository_id contexts)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> foreign_key_constraint(:repository_id)
    |> cast_embed(:git)
    |> cast_embed(:helm)
    |> cast_embed(:kustomize, with: &Service.kustomize_changeset/2)
  end
end
