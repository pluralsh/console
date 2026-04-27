defmodule Console.AI.Tools.Workbench.CanvasTest do
  use Console.DataCase, async: true

  alias Console.AI.Tool
  alias Console.AI.Tools.Workbench.Canvas

  describe "implement/1" do
    test "returns the parsed struct unchanged so the engine can dispatch it" do
      model = %Canvas{id: %Tool{id: "call_1", name: "build_dashboard", arguments: %{}}, prompt: "go"}

      assert {:ok, ^model} = Canvas.implement(model)
    end

    test "is reachable through Tool.implement/2 (regression for missing callback)" do
      assert {:ok, %Canvas{prompt: "go"}} = Tool.implement(Canvas, %Canvas{prompt: "go"})
    end
  end

  describe "changeset/2" do
    test "requires a prompt" do
      {:error, cs} =
        Canvas.changeset(%Canvas{}, %{})
        |> Ecto.Changeset.apply_action(:update)

      assert "can't be blank" in errors_on(cs).prompt
    end

    test "parses valid input" do
      assert {:ok, %Canvas{prompt: "build me a dashboard"}} =
               Canvas.changeset(%Canvas{}, %{"prompt" => "build me a dashboard"})
               |> Ecto.Changeset.apply_action(:update)
    end
  end
end
