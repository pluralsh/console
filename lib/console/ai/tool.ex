defmodule Console.AI.Tool do
  alias Console.Schema.{DeploymentSettings, User, Flow}
  alias Console.Deployments.{Git, Settings}

  @type t :: %__MODULE__{}

  defmodule Context do
    alias Console.Schema.{Flow, User}
    @type t :: %__MODULE__{flow: Flow.t, user: User.t}

    defstruct [:flow, :user]

    def new(args), do: struct(__MODULE__, args)
  end

  defstruct [:name, :arguments]

  @callback json_schema() :: map
  @callback name() :: atom
  @callback description() :: binary
  @callback changeset(struct, map) :: Ecto.Changeset.t
  @callback implement(struct) :: {:ok, term} | Console.error

  @ctx {__MODULE__, :context}

  def context(attrs), do: Process.put(@ctx, struct(Context, attrs))

  def actor() do
    case Process.get(@ctx) do
      %Context{user: %User{} = user} -> user
      _ -> nil
    end
  end

  def flow() do
    case Process.get(@ctx) do
      %Context{flow: %Flow{} = flow} -> flow
      _ -> nil
    end
  end

  def validate(tool, input) do
    struct(tool, %{})
    |> tool.changeset(input)
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
