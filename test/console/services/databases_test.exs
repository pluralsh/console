defmodule Console.Services.DatabasesTest do
  use Console.DataCase, async: true
  import KubernetesScaffolds

  alias Console.Services.Databases

  describe "#create_postgres_instance/1" do
    test "it won't throw on dupes" do
      pg = postgres("test")
      {:ok, inst} = Databases.create_postgres_instance(pg)
      {:error, _} = Databases.create_postgres_instance(pg)

      assert inst.name == pg.metadata.name
      assert inst.namespace == pg.metadata.namespace
      assert inst.uid == pg.metadata.uid
    end
  end
end
