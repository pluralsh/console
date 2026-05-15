defmodule Console.AI.Tools.Workbench.Calculator do
  @moduledoc """
  Workbench tool for evaluating arithmetic expressions.
  """
  use Console.AI.Tools.Workbench.Base
  alias Console.AI.Workbench.Calculator

  embedded_schema do
    field :explanation, :string
    field :expression, :string
  end

  @json_schema Console.priv_file!("tools/workbench/calculator.json") |> Jason.decode!()

  def name(), do: "workbench_calculator"
  def json_schema(), do: @json_schema

  def description(),
    do:
      "Evaluate an arithmetic expression and return the numeric result. Accepts arbitrary arithmetic input including parentheses and exponentiation."

  def changeset(model, attrs) do
    model
    |> cast(attrs, [:expression, :explanation])
    |> validate_required([:expression, :explanation])
  end

  def implement(%__MODULE__{expression: expression}) do
    with {:ok, value} <- Calculator.evaluate(expression),
      do: {:ok, "#{value}"}
  end
end
