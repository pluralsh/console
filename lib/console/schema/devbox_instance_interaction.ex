defmodule Console.Schema.DevboxInstanceInteraction do
  use Console.Schema.Base
  alias Console.Schema.{DevboxInstance, DevboxInstanceSession, User}

  defenum Kind, permission: 0, form_elicitation: 1, url_elicitation: 2
  defenum State, pending: 0, answered: 1, cancelled: 2, expired: 3

  schema "devbox_instance_interactions" do
    field :external_id,      :string
    field :jsonrpc_id,       :string
    field :tool_call_id,     :string
    field :kind,             Kind
    field :title,            :string
    field :message,          :string
    field :requested_schema, :map
    field :url,              :string
    # The permission request's tool call as the daemon sent it, read through Console.Devboxes.Acp.tool_call/1.
    field :tool_call,        :map
    field :state,            State, default: :pending
    field :answered_at,      :utc_datetime_usec
    field :response,         :map
    field :expires_at,       :utc_datetime_usec
    field :revision,         :integer, default: 0
    # Set instead of answered_by when the daemon answered by policy, e.g. "autonomy:full".
    field :answered_by_policy, :string

    # The daemon reviewer's verdict at autonomy auto; escalation says why a human was still asked.
    embeds_one :review, Review, on_replace: :update do
      field :verdict,    :string
      field :confidence, :float
      field :risk,       :string
      field :model,      :string
      field :escalation, :string
    end

    embeds_many :options, Option, on_replace: :delete do
      field :option_id, :string
      field :name,      :string
      field :kind,      :string
    end

    belongs_to :instance,    DevboxInstance
    belongs_to :session,     DevboxInstanceSession
    belongs_to :answered_by, User

    timestamps()
  end

  def for_instance(query \\ __MODULE__, instance_id) do
    from(i in query, where: i.instance_id == ^instance_id)
  end

  def for_workbench(query \\ __MODULE__, workbench_id) do
    from(i in query,
      join: inst in assoc(i, :instance),
      where: inst.workbench_id == ^workbench_id
    )
  end

  def pending(query \\ __MODULE__) do
    from(i in query, where: i.state == ^:pending)
  end

  def ordered(query \\ __MODULE__, order \\ [desc: :inserted_at]) do
    from(i in query, order_by: ^order)
  end

  @valid ~w(instance_id session_id external_id jsonrpc_id tool_call_id tool_call kind title message requested_schema url state
            answered_by_id answered_by_policy answered_at response expires_at revision)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:options, with: &option_changeset/2)
    |> cast_embed(:review, with: &review_changeset/2)
    |> foreign_key_constraint(:instance_id)
    |> foreign_key_constraint(:session_id)
    |> unique_constraint([:instance_id, :external_id])
    |> validate_length(:title, max: 255)
    |> validate_required([:instance_id, :external_id, :kind, :state])
  end

  defp review_changeset(model, attrs), do: cast(model, attrs, ~w(verdict confidence risk model escalation)a)

  defp option_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(option_id name kind)a)
    |> validate_required([:option_id])
  end
end
