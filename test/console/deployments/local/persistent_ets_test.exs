defmodule Console.Deployments.Local.PersistentEtsTest do
  use ExUnit.Case, async: true

  alias Console.Deployments.Local.PersistentEts

  test "creates an empty table when the snapshot does not exist" do
    {name, file} = unique_table()
    persistent =
      PersistentEts.new(name, file, [:set, :named_table], flush_interval: :timer.hours(1))

    on_exit(fn -> cleanup(persistent) end)

    assert [] = :ets.tab2list(persistent.table)
  end

  test "flushes a table and restores it from its snapshot" do
    {name, file} = unique_table()
    persistent =
      PersistentEts.new(name, file, [:set, :named_table], flush_interval: :timer.hours(1))

    :ets.insert(persistent.table, {:key, :value})
    assert :ok = PersistentEts.flush(persistent)

    :timer.cancel(persistent.timer)
    :ets.delete(persistent.table)

    restored =
      PersistentEts.new(name, file, [:set, :named_table], flush_interval: :timer.hours(1))

    on_exit(fn -> cleanup(restored) end)

    assert [{:key, :value}] = :ets.lookup(restored.table, :key)
  end

  defp unique_table do
    suffix = System.unique_integer([:positive])
    name = :"persistent_ets_test_#{suffix}"
    file = Path.join(System.tmp_dir!(), "#{name}.tab")
    File.rm(file)
    {name, file}
  end

  defp cleanup(%PersistentEts{table: table, file: file, timer: timer}) do
    :timer.cancel(timer)

    if :ets.info(table) != :undefined do
      :ets.delete(table)
    end

    File.rm(file)
  end
end
