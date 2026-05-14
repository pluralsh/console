defmodule Console.Schema.ChatbotMessage do
  use Console.Schema.Base
  alias Console.Schema.{ChatConnection, WorkbenchJob}

  schema "chatbot_messages" do
    field :message, :binary
    field :channel, :string

    belongs_to :chat_connection, ChatConnection
    belongs_to :workbench_job, WorkbenchJob

    timestamps()
  end

  def for_job(query \\ __MODULE__, job_id) do
    from(m in query, where: m.workbench_job_id == ^job_id)
  end

  @valid ~w(message channel chat_connection_id workbench_job_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> foreign_key_constraint(:chat_connection_id)
    |> foreign_key_constraint(:workbench_job_id)
    |> validate_required([:message, :channel, :chat_connection_id])
  end
end
