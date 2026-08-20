defmodule Console.AI.Tools.Workbench.PythonTest do
  use Console.DataCase, async: false
  use Mimic

  alias CloudQuery.Client
  alias Console.AI.Tools.Workbench.Python
  alias Toolquery.{RunPythonOutput}
  alias Toolquery.ToolQuery.Stub

  setup :set_mimic_global

  test "exposes the Python tool contract" do
    assert Python.name() == "workbench_python"
    assert %{"input" => %{"type" => "object"}} = Python.json_schema()["properties"]
    assert Python.json_schema()["required"] == ["code", "explanation"]
  end

  test "requires an explanation and Python code" do
    changeset = Python.changeset(%Python{}, %{})

    refute changeset.valid?
    assert %{code: ["can't be blank"], explanation: ["can't be blank"]} = errors_on(changeset)
  end

  test "runs Monty Python with JSON input and returns decoded output and stdout" do
    expect(Client, :connect, fn -> {:ok, :channel} end)

    expect(Stub, :run_python, fn :channel, request, opts ->
      assert request.script == "output['total'] = input['first'] + input['second']"
      assert request.input_json == ~s({"first":20,"second":22})
      assert opts == Client.cloud_query_rpc_opts()

      {:ok, %RunPythonOutput{result_json: ~s({"total":42}), stdout: "calculated total\\n"}}
    end)

    assert {:ok, %{result: %{"total" => 42}, stdout: "calculated total\n"}} =
             Python.implement(%Python{
               code: "output['total'] = input['first'] + input['second']",
               input: %{"first" => 20, "second" => 22}
             })
  end

  test "defaults omitted input to an empty JSON object" do
    expect(Client, :connect, fn -> {:ok, :channel} end)

    expect(Stub, :run_python, fn :channel, request, _opts ->
      assert request.input_json == "{}"
      {:ok, %RunPythonOutput{result_json: "{}", stdout: ""}}
    end)

    assert {:ok, %{result: %{}, stdout: ""}} = Python.implement(%Python{code: "output = {}"})
  end
end
