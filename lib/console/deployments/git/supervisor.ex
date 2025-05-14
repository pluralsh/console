defmodule Console.Deployments.Git.Supervisor do
  use DynamicSupervisor
  alias Console.Deployments.Git.Agent

  def start_link(init_arg \\ :ok) do
    DynamicSupervisor.start_link(__MODULE__, init_arg, name: __MODULE__)
  end

  def start_child(repository) do
    DynamicSupervisor.start_child(__MODULE__, {Agent, repository})
  end

  @impl true
  def init(_init_arg) do
    :ets.new(:git_cache, [:set, :public, :named_table, write_concurrency: true, read_concurrency: true])
    DynamicSupervisor.init(strategy: :one_for_one)
  end
end
