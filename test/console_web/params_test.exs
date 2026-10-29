defmodule ConsoleWeb.ParamsTest do
  use ExUnit.Case, async: true
  alias ConsoleWeb.Params

  describe "#permit/2" do
    test "it keeps only permitted keys, as atoms, through nested objects and lists" do
      params = %{
        "name" => "a",
        "id" => "dropped",
        "ref" => %{"kind" => "Pod", "secret" => "dropped"},
        "items" => [%{"value" => 1, "other" => 2}, %{"value" => 3}],
        "tags" => ["x", "y"],
        "empty" => nil
      }

      assert Params.permit(params, [:name, :tags, :empty, :missing, ref: [:kind], items: [:value]]) == %{
        name: "a",
        tags: ["x", "y"],
        empty: nil,
        ref: %{kind: "Pod"},
        items: [%{value: 1}, %{value: 3}]
      }
    end

    test "it leaves values that don't match a nested spec for changesets to reject" do
      assert Params.permit(%{"ref" => "Pod"}, ref: [:kind]) == %{ref: "Pod"}
      assert Params.permit([%{"a" => 1}, "b"], [:a]) == [%{a: 1}, "b"]
    end
  end
end
