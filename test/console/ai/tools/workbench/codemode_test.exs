defmodule Console.AI.Tools.Workbench.CodemodeTest do
  use ExUnit.Case, async: false
  use Mimic

  alias Console.AI.Tools.Workbench.Codemode
  alias Console.AI.Tools.Workbench.Infrastructure.KubeList

  Mimic.copy(KubeList)

  setup :set_mimic_global

  test "executes Python against a mounted infrastructure tool" do
    expect(KubeList, :implement, fn %KubeList{
                                      cluster: "demo",
                                      version: "v1",
                                      kind: "Pod",
                                      namespace: "default"
                                    } ->
      {:ok, Jason.encode!(%{"items" => [%{"metadata" => %{"name" => "api"}}]})}
    end)

    sandbox = %Codemode{
      tools: [%KubeList{}],
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
      tools: [%KubeList{}],
      policies: [],
      python: ~s|list_k8s_resources("not a dictionary", "extra")|
    }

    assert {:error, message} = Codemode.implement(sandbox)
    assert message =~ "value_error"
    assert message =~ "tool arguments must be keyword arguments or a single dictionary"
  end
end
