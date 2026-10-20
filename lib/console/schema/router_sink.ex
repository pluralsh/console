defmodule Console.Schema.RouterSink do
  use Console.Schema.Base
  alias Console.Schema.{NotificationRouter, NotificationSink}

  schema "router_sinks" do
    belongs_to :router, NotificationRouter
    belongs_to :sink,   NotificationSink

    timestamps()
  end

  @valid ~w(router_id sink_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> validate_uuids(@valid)
    |> foreign_key_constraint(:router_id)
    |> foreign_key_constraint(:sink_id)
  end
end
