defmodule Console.AI.Workbench.FileCache do
  alias Console.Deployments.{Services, Stacks}
  alias Console.Schema.{Service, Stack, User}

  defstruct [:table]

  def new() do
    %__MODULE__{table: :ets.new(:file_cache, [:set, :private, read_concurrency: true])}
  end

  def fetch(%__MODULE__{table: table}, %Service{} = service, %User{} = user) do
    fetch_cached(table, service.id, fn -> Services.service_files(service.id, user) end)
  end

  def fetch(%__MODULE__{table: table}, %Stack{} = stack, %User{} = user) do
    fetch_cached(table, stack.id, fn -> Stacks.stack_files(stack.id, user) end)
  end

  def fetch(_, _, _), do: {:error, "no service or stack provided to file cache, likely does not exist"}

  defp fetch_cached(table, id, fun) when is_function(fun, 0) do
    case :ets.lookup(table, id) do
      [{^id, files}] -> {:ok, files}
      _ -> insert(fun.(), id, table)
    end
  end

  defp insert({:ok, files}, id, table) do
    :ets.insert(table, {id, files})
    {:ok, files}
  end
  defp insert(err, _id, _table), do: err
end
