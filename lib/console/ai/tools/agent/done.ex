defmodule Console.AI.Tools.Agent.Done do
  use Console.AI.Tools.Agent.Base

  embedded_schema do
  end

  @valid ~w()a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
  end

  @json_schema Console.priv_file!("tools/done.json") |> Jason.decode!()

  def json_schema(), do: @json_schema
  def name(), do: plrl_tool("mark_done")
  def description(), do: "Mark the current task for this session as done"

  def implement(_) do
    with {:ok, _session} <- update_session(%{done: true}) do
      {:ok, "Session successfully marked as done"}
    end
  end
end
