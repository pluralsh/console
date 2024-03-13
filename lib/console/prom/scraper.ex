defmodule Console.Prom.Scraper do
  use GenServer

  @scrape_interval :timer.minutes(10)

  def start_link(opts \\ :ok) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  def init(_) do
    :timer.send_interval(@scrape_interval, :scrape)
    {:ok, %{}}
  end

  def handle_info(:scrape, state) do
    Console.Deployments.Git.Statistics.disk()
    {:noreply, state}
  end
end
