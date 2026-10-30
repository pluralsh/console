defmodule Console.Utils.YamlTest do
  use ExUnit.Case, async: true
  alias Console.Utils.Yaml

  describe "#decode/1" do
    test "it decodes maps, lists and typed scalars" do
      {:ok, res} = Yaml.decode("""
      a: 1
      b: [true, ~, 1.5, "2"]
      c:
        d: text
      """)

      assert res == %{"a" => 1, "b" => [true, nil, 1.5, "2"], "c" => %{"d" => "text"}}
    end

    test "it resolves anchors and merge keys" do
      {:ok, res} = Yaml.decode("base: &b {x: 1, y: 2}\nmerged:\n  <<: *b\n  y: 3\n")

      assert res["merged"] == %{"x" => 1, "y" => 3}
    end

    test "empty documents decode to an empty map" do
      assert Yaml.decode("") == {:ok, %{}}
      assert Yaml.decode("# just a comment\n") == {:ok, %{}}
    end

    test "invalid yaml returns an error message" do
      {:error, msg} = Yaml.decode("a: : b")

      assert is_binary(msg)
    end
  end

  describe "#decode_all/1" do
    test "it decodes every document in a stream" do
      {:ok, docs} = Yaml.decode_all("""
      # header comment
      ---
      a: 1
      ...
      %YAML 1.2
      ---
      b: |
        ---
        not a marker
      ---
      --- [1, 2]
      """)

      assert docs == [%{"a" => 1}, %{"b" => "---\nnot a marker\n"}, %{}, [1, 2]]
    end

    test "a document without a start marker is still decoded" do
      assert Yaml.decode_all("a: 1\n---\nb: 2\n") == {:ok, [%{"a" => 1}, %{"b" => 2}]}
    end

    test "empty and comment-only streams have no documents" do
      assert Yaml.decode_all("") == {:ok, []}
      assert Yaml.decode_all("# nothing here\n") == {:ok, []}
    end

    test "error positions are relative to the whole stream" do
      {:error, msg} = Yaml.decode_all("a: 1\n---\nb: : c\n")

      assert msg =~ "line 3"
    end
  end

  describe "#decode_file/1" do
    @tag :tmp_dir
    test "it decodes a file", %{tmp_dir: dir} do
      path = Path.join(dir, "values.yaml")
      File.write!(path, "a: b\n")

      assert Yaml.decode_file(path) == {:ok, %{"a" => "b"}}
      assert {:error, :enoent} = Yaml.decode_file(Path.join(dir, "missing.yaml"))
    end
  end
end
