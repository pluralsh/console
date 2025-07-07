defmodule Console.AI.Tools.Agent.CallPr do
  use Console.AI.Tools.Agent.Base

  embedded_schema do
    field :pr_automation_id, :string
  end

  @valid ~w(pr_automation_id)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> validate_required([:pr_automation_id])
  end

  def json_schema(), do: Console.priv_file!("tools/agent/call_pr.json") |> Jason.decode!()
  def name(), do: plrl_tool("call_pr_automation")
  def description(), do: "Prompts a user to execute a pr automation by id, which should be discoverd by searching catalogs and pr automations within them."

  def implement(%__MODULE__{pr_automation_id: pra_id}) do
    {:ok, %{content: "Calling pr #{pra_id}", type: :pr_call, pr_automation_id: pra_id}}
  end
end
