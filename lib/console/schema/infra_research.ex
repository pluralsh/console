defmodule Console.Schema.InfraResearch do
  use Console.Schema.Base
  alias Console.Schema.{User, ChatThread, ResearchAssociation}

  defenum Status, pending: 0, running: 1, completed: 2, failed: 3

  schema "infra_research" do
    field :status,    Status, default: :pending
    field :phase,     :string, virtual: true
    field :published, :boolean, default: false
    field :prompt,    :binary
    field :diagram,   :binary

    embeds_one :analysis, Analysis, on_replace: :update do
      field :summary, :string
      field :notes,   {:array, :string}
    end

    belongs_to :user, User

    has_many :threads,      ChatThread, foreign_key: :research_id
    has_many :associations, ResearchAssociation,
      foreign_key: :research_id,
      on_replace: :delete

    timestamps()
  end

  def for_user(query \\ __MODULE__, user_id) do
    from(r in query, where: r.user_id == ^user_id or (not is_nil(r.published) and r.published))
  end

  def ordered(query \\ __MODULE__, order \\ [desc: :inserted_at]) do
    from(r in query, order_by: ^order)
  end

  @valid ~w(prompt diagram user_id status published)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:analysis, with: &analysis_changeset/2)
    |> cast_assoc(:associations)
    |> validate_required([:prompt, :user_id, :status])
  end

  def analysis_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(summary notes)a)
    |> validate_required([:summary])
  end
end
