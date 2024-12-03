defmodule Console.AI.Tool do
  alias Console.Schema.{DeploymentSettings, User}
  alias Console.Deployments.{Git, Settings}

  @type t :: %__MODULE__{}

  defstruct [:name, :arguments]

  @callback json_schema() :: map
  @callback name() :: atom
  @callback description() :: binary
  @callback changeset(struct, map) :: Ecto.Changeset.t
  @callback implement(struct) :: {:ok, term} | Console.error

  def set_actor(%User{} = user), do: Process.put({__MODULE__, :actor}, user)

  def actor(), do: Process.get({__MODULE__, :actor})

  def validate(tool, input) do
    tool.changeset(struct(tool, %{}), input)
    |> Ecto.Changeset.apply_action(:update)
  end

  def scm_connection() do
    case Settings.cached() do
      %DeploymentSettings{ai: %{tools: %{create_pr: %{connection_id: id}}}} when is_binary(id) ->
        Git.get_scm_connection(id)
      _ -> Git.default_scm_connection()
    end
  end
end
