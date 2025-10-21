defmodule Console.Schema.AgentMessage do
  use Piazza.Ecto.Schema
  alias Console.Schema.AgentRun

  defenum ToolState, pending: 0, running: 1, completed: 2, error: 3

  schema "agent_messages" do
    field :role,    Console.Schema.Chat.Role
    field :message, :binary
    field :seq,     :integer

    embeds_one :cost, Cost, on_replace: :update do
      field :total,  :float
      embeds_one :tokens, Tokens, on_replace: :update do
        field :input,     :float
        field :output,    :float
        field :reasoning, :float
      end
    end

    embeds_one :metadata, Metadata, on_replace: :update do
      embeds_one :reasoning, Reasoning, on_replace: :update do
        field :text,  :string
        field :start, :utc_datetime_usec
        field :end,   :utc_datetime_usec
      end

      embeds_one :file, File, on_replace: :update do
        field :name,  :string
        field :text,  :string
        field :start, :integer
        field :end,   :integer
      end

      embeds_one :tool, Tool, on_replace: :update do
        field :name,   :string
        field :state,  ToolState
        field :output, :string
      end
    end

    belongs_to :agent_run, AgentRun

    timestamps()
  end

  def for_run(query \\ __MODULE__, run_id) do
    from(ap in query, where: ap.agent_run_id == ^run_id)
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :seq]) do
    from(ap in query, order_by: ^order)
  end

  @valid ~w(agent_run_id message role)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:cost, with: &cost_changeset/2)
    |> cast_embed(:metadata, with: &metadata_changeset/2)
    |> validate_required(~w(role message)a)
  end

  defp cost_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(total)a)
    |> cast_embed(:tokens, with: &tokens_changeset/2)
  end

  defp tokens_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(input output reasoning)a)
  end

  defp metadata_changeset(model, attrs) do
    model
    |> cast(attrs, [])
    |> cast_embed(:reasoning, with: &reasoning_changeset/2)
    |> cast_embed(:file, with: &file_changeset/2)
    |> cast_embed(:tool, with: &tool_changeset/2)
  end

  defp reasoning_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(text start end)a)
  end

  defp file_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(name text start end)a)
    |> validate_required(~w(name text)a)
  end

  defp tool_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(name state output)a)
    |> validate_required(~w(name state)a)
  end
end
