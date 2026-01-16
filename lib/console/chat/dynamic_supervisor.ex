defmodule Console.Chat.DynamicSupervisor do
  use DynamicSupervisor
  alias Console.Schema.ChatConnection
  alias Console.Chat.Impl.Slack

  def start_link(init_arg) do
    DynamicSupervisor.start_link(__MODULE__, init_arg, name: __MODULE__)
  end

  def start_child(%ChatConnection{id: id} = conn) do
    DynamicSupervisor.start_child(__MODULE__, %{
      id: id,
      restart: :transient,
      start: worker_spec(conn)
    })
  end

  def terminate_child(pid), do: DynamicSupervisor.terminate_child(__MODULE__, pid)

  @impl true
  def init(init_arg) do
    DynamicSupervisor.init(
      strategy: :one_for_one,
      restart: :transient,
      max_children: 30,
      extra_arguments: [init_arg]
    )
  end

  defp worker_spec(%ChatConnection{type: :slack} = conn),
    do: Slack.child_spec(conn)
end
