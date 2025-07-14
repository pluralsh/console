defmodule Console.AI.Tools.Agent.Plan do
  use Console.AI.Tools.Agent.Base
  alias Console.Repo

  embedded_schema do
    field :plan, :string
    field :required_services, {:array, :string}
    field :open_questions, {:array, :string}
  end

  @valid ~w(plan required_services open_questions)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> validate_required([:plan])
  end

  @json_schema Console.priv_file!("tools/agent/plan.json") |> Jason.decode!()

  def json_schema(), do: @json_schema
  def name(), do: plrl_tool("cloud_plan")
  def description(), do: "Generates a plan for the infrastructure that would be needed to create what the user is asking for"

  def implement(%__MODULE__{plan: plan} = model) do
    with {:session, %AgentSession{} = session} <- session(),
         {:ok, _} <- unconfirm(session) do
      {:ok, %{
        content: plan,
        type: :implementation_plan,
        attributes: %{
          plan: Map.take(model, [:required_services, :open_questions])}
        }
      }
    else
      {:session, _} -> {:ok, "No cloud connection tied to this session, cannot plan"}
      err -> err
    end
  end

  defp unconfirm(%AgentSession{} = session) do
    AgentSession.changeset(session, %{plan_confirmed: false})
    |> Repo.update()
  end
end
