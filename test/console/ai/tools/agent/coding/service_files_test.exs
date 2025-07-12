defmodule Console.AI.Tools.Agent.Coding.ServiceFilesTest do
  use Console.DataCase, async: false
  alias Console.AI.Tools.Agent.Coding.ServiceFiles

  describe "implement/1" do
    test "it can fetch stack files" do
      git = insert(:git_repository, url: "https://github.com/pluralsh/scaffolds.git")
      service = insert(:service, repository: git, git: %{ref: "main", folder: "catalogs/data/airbyte/terraform/aws"})

      actor = admin_user()
      session = insert(:agent_session)
      Console.AI.Tool.context(user: actor, session: session, thread: session.thread)

      {:ok, [_ | _] = msgs} = ServiceFiles.implement(%ServiceFiles{service_id: service.id})

      refute Enum.empty?(msgs)
      assert Enum.all?(msgs, & is_binary(&1.content))
      assert refetch(session).service_id == service.id
    end
  end
end
