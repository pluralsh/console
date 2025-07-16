defmodule Console.AI.Tools.Agent.Role do
  use Console.AI.Tools.Agent.Base

  embedded_schema do
    field :role, AgentSession.Type
  end

  @valid ~w(role)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
  end

  @json_schema Console.priv_file!("tools/agent/role.json") |> Jason.decode!()

  def json_schema(), do: @json_schema
  def name(), do: plrl_tool("change_role")
  def description(), do: "Changes the role the assistant will play in helping the user"

  def implement(%__MODULE__{role: role}) do
    with {:ok, _} <- update_session(%{type: role}),
      do: {:ok, "Role changed to #{role}"}
  end
end
