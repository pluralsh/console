defmodule Console.AI.Tools.Explain.ReadTest do
  use Console.DataCase, async: false
  alias Console.AI.Tools.Explain.Read
  alias Console.AI.Tool

  describe "explain/1" do
    test "it can explain a service" do
      repository = insert(:git_repository, url: "https://github.com/pluralsh/deployment-operator.git")
      service = insert(:service,
        repository: repository,
        git: %{folder: "charts/deployment-operator", ref: "main"}
      )
      user = admin_user()
      Tool.context(user: user, service: service)

      {:ok, result} = Read.implement(%Read{file: "values.yaml"})
      {:ok, %{"file" => %{"path" => "values.yaml", "content" => content}}} = JSON.decode(result)

      assert is_binary(content)
    end
  end
end
