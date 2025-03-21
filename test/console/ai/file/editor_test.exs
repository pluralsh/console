defmodule Console.AI.File.EditorTest do
  use Console.DataCase, async: true
  alias Console.AI.File.Editor

  @content "\nglobal:\n  grafana:\n    enabled: false\n    proxy: false\n\nkubecostFrontend:\n  enabled: true\n\nserviceMonitor:\n  enabled: true\n\nserver:\n  global:\n    external_labels:\n      cluster_id: {{ cluster.handle }}\nkubecostModel:\n  resources:\n    requests:\n      cpu: \"24.403m\"\n      memory: \"1080Mi\"\n"
  @old " resources:\n requests:\n cpu: \"24.403m\"\n memory: \"1080Mi\""
  @new " resources:\n requests:\n cpu: \"40m\"\n memory: \"1400Mi\""

  describe "#replace/3" do
    @tag :skip
    test "it can replace a file" do
      {:ok, f} = Briefly.create()
      File.write!(f, @content)

      :ok = Editor.replace(f, @old, @new)

      {:ok, res} = File.read(f)
      IO.puts(res)
      {:ok, _} = YamlElixir.read_from_string(res)
    end
  end
end
