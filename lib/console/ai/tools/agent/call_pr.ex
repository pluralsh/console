defmodule Console.AI.Tools.Agent.CallPr do
  use Console.AI.Tools.Agent.Base

  embedded_schema do
    field :pr_automation_id, :string
    field :context,          :map
  end

  @valid ~w(pr_automation_id context)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> validate_required([:pr_automation_id])
  end

  @json_schema Console.priv_file!("tools/agent/call_pr.json") |> Jason.decode!()
  def json_schema(), do: @json_schema
  def name(), do: plrl_tool("call_pr_automation")
  def description(), do: "Prompts a user to execute a pr automation by id, which should be discoverd by searching catalogs and pr automations within them."

  def implement(%__MODULE__{pr_automation_id: pra_id} = model) do
    {:ok, %{
      content: "Calling pr #{pra_id}, the user will be prompted for how to configure this PR in product (don't reiterate what configuration is necessary)",
      type: :pr_call,
      pr_automation_id: pra_id,
      attributes: %{pr_call: %{context: model.context}}
    }}
  end
end
