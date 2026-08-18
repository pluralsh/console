defmodule Console.AI.Tools.Workbench.CodemodeTest do
  use ExUnit.Case, async: false
  use Mimic

  alias Console.AI.Tools.Workbench.Codemode
  alias Console.AI.Tools.Workbench.OutputType
  alias Console.AI.Tools.Workbench.Infrastructure.RawCloudQuery
  alias Console.AI.Tools.Workbench.Infrastructure.RawKubeList

  Mimic.copy(RawKubeList)

  setup :set_mimic_global

  test "executes Python against a mounted infrastructure tool" do
    expect(RawKubeList, :implement, fn %RawKubeList{
                                        cluster: "demo",
                                        version: "v1",
                                        kind: "Pod",
                                        namespace: "default"
                                      } ->
      {:ok, %{"items" => [%{"metadata" => %{"name" => "api"}}]}}
    end)

    sandbox = %Codemode{
      tools: [%RawKubeList{}],
      policies: [],
      python: """
      resources = list_k8s_resources(
          cluster="demo",
          version="v1",
          kind="Pod",
          namespace="default",
      )
      {"names": [item["metadata"]["name"] for item in resources["items"]]}
      """
    }

    assert {:ok, result} = Codemode.implement(sandbox)
    assert Jason.decode!(result) == %{"result" => %{"names" => ["api"]}, "stdout" => ""}
  end

  test "truncates oversized sandbox output" do
    sandbox = %Codemode{
      tools: [],
      policies: [],
      python: ~s|"x" * 120000|
    }

    assert {:ok, output} = Codemode.implement(sandbox)
    assert byte_size(output) == 100_000
    assert output =~ "output truncated at 100000 bytes"
  end

  test "passes raw cloud query results into the sandbox without JSON decoding" do
    result = [%{"name" => "demo-dev"}]

    assert OutputType.convert(%RawCloudQuery{}, result) == result
  end

  test "returns Python execution errors" do
    sandbox = %Codemode{
      tools: [],
      policies: [],
      python: ~s|raise ValueError("invalid sandbox input")|
    }

    assert {:error, message} = Codemode.implement(sandbox)
    assert message =~ "Failed to execute Python code"
    assert message =~ "invalid sandbox input"
  end

  test "returns value errors for invalid mounted tool arguments" do
    sandbox = %Codemode{
      tools: [%RawKubeList{}],
      policies: [],
      python: ~s|list_k8s_resources("not a dictionary", "extra")|
    }

    assert {:error, message} = Codemode.implement(sandbox)
    assert message =~ "value_error"
    assert message =~ "tool arguments must be keyword arguments or a single dictionary"
  end

  test "does not expose jq on raw Kubernetes list tools" do
    refute Map.has_key?(RawKubeList.json_schema(%RawKubeList{})["properties"], "jq")
  end
end
