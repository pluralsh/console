defmodule Console.AI.Tools.Agent.Coding.PrPlan do
  use Console.AI.Tools.Agent.Base

  embedded_schema do
    field :plan,     :string
    field :repo_url, :string
  end

  @valid ~w(plan repo_url)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> validate_required(@valid)
  end

  @json_schema Console.priv_file!("tools/agent/coding/pr_plan.json") |> Jason.decode!()

  def json_schema(), do: @json_schema
  def name(), do: plrl_tool("pr_plan")
  def description(), do: "Records and a plan for a PR to perform, and unlocks the ability to generate a PR as the next step"

  def implement(%__MODULE__{} = plan) do
    with {:ok, _} <- update_session(%{plan_confirmed: true}) do
      {:ok, """
      Here's the plan for the PR against #{plan.repo_url}:

      #{plan.plan}
      """}
    end
  end
end
