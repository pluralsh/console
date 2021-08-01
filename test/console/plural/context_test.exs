defmodule Console.Plural.ContextTest do
  use ExUnit.Case
  alias Console.Plural.Context

  describe "#merge/2" do
    test "it can merge both bundle and configuration data" do
      {:ok, old} = Context.get()

      {:ok, _} = Context.merge(
        %{"airflow" => %{"merged" => "value"}},
        %Context.Bundle{repository: "airflow", name: "test"}
      )

      {:ok, new} = Context.get()

      assert new.configuration["airflow"]["merged"] == "value"
      assert new.configuration["airflow"]["example"] == "key"

      assert Enum.find(new.bundles, fn %{repository: r, name: n} ->
        r == "airflow" && n == "test"
      end)

      {:ok, _} = Context.write(old)
    end
  end
end
