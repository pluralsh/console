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
  def description(), do: """
  Changes the role the assistant will play in helping the user.  This is useful when the user is looking for a different type of help, or when the assistant needs to be more specific in the type of help they are providing.

  The roles are:
  - search: The assistant will help the user understand their kubernetes and cloud estate, and provide links to the Plural Console to dive into it further.
  - provisioning: The assistant will help the user provision new kubernetes or cloud infrastructure, use this whenever the user asks to deploy something new.
  - manifests: The assistant will help the user write new kubernetes yaml manifests within the context of a cluster.
  """

  def implement(%__MODULE__{role: role}) do
    with {:ok, _} <- update_session(%{type: role}),
      do: Jason.encode(%{role: role})
  end
end
