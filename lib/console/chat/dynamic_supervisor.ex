defmodule Console.Chat.DynamicSupervisor do
  use DynamicSupervisor
  alias Console.Schema.ChatConnection
  alias Console.Chat.Bot

  def start_link(init_arg) do
    DynamicSupervisor.start_link(__MODULE__, init_arg, name: __MODULE__)
  end

  def start_child(%ChatConnection{id: id} = conn) do
    DynamicSupervisor.start_child(__MODULE__, %{
      id: id,
      restart: :transient,
      start: {Bot, :start_link, [conn]}
    })
  end

  def terminate_child(pid), do: DynamicSupervisor.terminate_child(__MODULE__, pid)

  @impl true
  def init(_init_arg) do
    DynamicSupervisor.init(
      strategy: :one_for_one,
      restart: :transient,
      max_children: 30
    )
  end
end
