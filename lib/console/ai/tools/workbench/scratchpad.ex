defmodule Console.AI.Tools.Workbench.Scratchpad do
  use Console.AI.Tools.Workbench.Base

  @key {__MODULE__, :pad}

  embedded_schema do
    field :update, :string
  end

  @json_schema Console.priv_file!("tools/workbench/scratchpad.json") |> Jason.decode!()

  def name(), do: "agent_scratchpad"
  def json_schema(), do: @json_schema
  def description(), do: "Either shows or updates the scratchpad.  Use this to store any notes during your investigation for future reference."

  def changeset(model, attrs) do
    model
    |> cast(attrs, [:update])
  end

  def implement(%__MODULE__{update: nil}), do: {:ok, Process.get(@key) || "no notes yet"}
  def implement(%__MODULE__{update: update}) when is_binary(update) do
    Process.put(@key, update)
    {:ok, update}
  end
end
