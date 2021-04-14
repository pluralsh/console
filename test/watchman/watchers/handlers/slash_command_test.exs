defmodule Watchman.Watchers.Handlers.SlashCommandTest do
  use Watchman.DataCase, async: true
  use Mimic
  alias Watchman.Watchers.Handlers.SlashCommand

  describe "handle/1" do
    test "It will dispatch a command when given" do
      insert(:user, bot_name: "watchman")
      expect(Kazan, :run, 2, fn
        %{path: "/apis/forgelabs.sh/v1alpha1/namespaces/repo/slashcommands/deploy"} ->
          {:ok, %Kube.SlashCommand{spec: %{type: "deploy"}}}
        _ -> {:ok, %Kube.Application{metadata: %{name: "plural"}}}
      end)
      expect(Watchman.Deployer, :wake, fn -> :ok end)
      expect(Watchman.Plural.Incidents, :create_message, fn "id", _ -> {:ok, :created} end)

      {:ok, {:ok, build}, :created} = SlashCommand.handle(%{
        "text" => "/deploy",
        "incident" => %{"id" => "id", "repository" => %{"name" => "repo"}}
      })

      assert build.repository == "repo"
    end

    test "non slashcommands are ignored" do
      :ok = SlashCommand.handle(%{
        "text" => "just a normal message",
        "incident" => %{"id" => "id", "repository" => %{"name" => "repo"}}
      })
    end
  end
end
