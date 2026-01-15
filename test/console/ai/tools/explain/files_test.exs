defmodule Console.AI.Tools.Explain.FilesTest do
  use Console.DataCase, async: false
  alias Console.AI.Tools.Explain.Files
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

      {:ok, result} = Files.implement(%Files{})
      {:ok, %{"files" => [_ | _]}} = JSON.decode(result)
    end
  end
end
