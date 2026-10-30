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

  describe "#cast_all/3" do
    alias Console.Schema.ClusterScalingRecommendation, as: Rec

    test "it casts rows to the schema's types, dropping nulls and fields it lacks" do
      {:ok, [row]} = Params.cast_all(
        [%{"type" => "deployment", "cpu_util" => 1, "memory_util" => nil, "gpu_util" => 1.0, "cluster_id" => "x"}],
        Rec,
        ~w(type cpu_util memory_util gpu_util)a
      )

      assert row == %{type: :deployment, cpu_util: 1.0}
    end

    test "it returns changeset errors and rejects non-objects" do
      assert {:error, %Ecto.Changeset{}} = Params.cast_all([%{"cpu_util" => "high"}], Rec, [:cpu_util])
      assert {:error, {:bad_request, _}} = Params.cast_all(["a"], Rec, [:cpu_util])
      assert {:error, {:bad_request, _}} = Params.cast_all(%{}, Rec, [:cpu_util])
      assert {:ok, nil} = Params.cast_all(nil, Rec, [:cpu_util])
    end
  end

  describe "#require_keys/2" do
    test "it requires string values for every key" do
      assert {:ok, _} = Params.require_keys([%{name: "a", group: ""}], [:name, :group])
      assert {:error, {:bad_request, _}} = Params.require_keys([%{name: "a"}], [:name, :group])
      assert {:error, {:bad_request, _}} = Params.require_keys(["a"], [:name])
    end
  end
end
