defmodule Console.AI.Tools.Agent.CallPr do
  use Console.AI.Tools.Agent.Base
  alias Console.Schema.PrAutomation

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
    with_pra(pra_id, fn pra ->
      {:ok, %{
        content: "Calling pr #{pra.name} (id=#{pra.id}), the user will be prompted for how to configure this PR in product (don't reiterate what configuration is necessary)",
        type: :pr_call,
        pr_automation_id: pra_id,
        attributes: %{pr_call: %{context: get_context(model)}}
      }}
    end)
  end

  def with_pra(id, fun) do
    case Console.Repo.get(PrAutomation, id) do
      nil -> {:ok, "Pr automation #{id} not found"}
      pra -> fun.(pra)
    end
  end

  defp get_context(%__MODULE__{context: ctx}) when is_binary(ctx) do
    case Jason.decode(ctx) do
      {:ok, %{} = map} -> map
      _ -> nil
    end
  end
  defp get_context(%__MODULE__{context: _}), do: nil
end
