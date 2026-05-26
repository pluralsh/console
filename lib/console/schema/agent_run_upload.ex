defmodule Console.Schema.AgentRunUpload do
  use Console.Schema.Base
  use Waffle.Ecto.Schema
  alias Console.Uploads.Type
  alias Console.Schema.AgentRun

  schema "agent_run_uploads" do
    field :session,          Type
    field :screen_recording, Type
    field :patch,            Type

    belongs_to :agent_run, AgentRun

    timestamps()
  end

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, [:agent_run_id])
    |> cast_attachments(attrs, [:session, :screen_recording, :patch])
    |> foreign_key_constraint(:agent_run_id)
  end
end
