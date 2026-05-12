defmodule Console.AI.Agents.PrTest do
  use Console.DataCase, async: false
  alias Console.AI.Agents.Pr
  alias Console.AI.{Provider}
  alias Console.AI.Tool
  import ElasticsearchUtils
  use Mimic

  setup :set_mimic_global

  describe "exec/1" do
    test "it can execute an pr automation and terminate with a commit call" do
      deployment_settings(
        logging: %{enabled: true, driver: :elastic, elastic: es_settings()},
        ai: %{
          enabled: true,
          provider: :openai,
          openai: %{access_token: "key"},
          vector_store: %{
            enabled: true,
            store: :elastic,
            elastic: es_vector_settings(),
          },
        }
      )
      {:ok, dir} = Briefly.create(directory: true)
      path = Path.join(dir, "file.yaml")


      expect(Provider, :completion, fn _, _ -> {:ok, "Upgrade the addon", [
        %Tool{name: "read", arguments: %{"path" => "file.yaml"}, id: "1"}
      ]} end)
      expect(File, :read, fn ^path -> {:ok, "content"} end)
      expect(Provider, :completion, fn _, _ -> {:ok, "Upgrade the addon", [
        %Tool{name: "edit", arguments: %{"path" => "file.yaml", "previous" => "content", "replacement" => "new content"}, id: "1"}
      ]} end)
      expect(File, :write, fn ^path, "new content" -> :ok end)
      expect(Provider, :completion, fn _, _ -> {:ok, "Upgrade the addon", [
        %Tool{name: "commit", arguments: %{"message" => "commit message", "title" => "title"}, id: "1"}
      ]} end)

      {:ok, commit} = Pr.exec(dir, "some prompt")

      assert commit.message == "commit message"
      assert commit.title == "title"
    end
  end
end
