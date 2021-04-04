defmodule Watchman.Forge.Config do
  use GenServer
  @table_name :forge_config

  def start_link(args \\ :ok) do
    GenServer.start_link(__MODULE__, args, name: __MODULE__)
  end

  def init(_) do
    send self(), :populate
    {:ok, :ets.new(@table_name, [:set, :protected, :named_table])}
  end

  def handle_info(:populate, state) do
    :ets.insert(@table_name, {:conf_file, config_file()})
    :ets.insert(@table_name, {:config, derive_config()})
    {:noreply, state}
  end

  def fetch() do
    case :ets.lookup(@table_name, :config) do
      [{:config, config}] -> config
      _ -> nil
    end
  end

  def fetch_file() do
    case :ets.lookup(@table_name, :conf_file) do
      [{:conf_file, config}] -> config
      _ -> nil
    end
  end

  def derive_config() do
    with nil <- System.get_env("CHARTMART_TOKEN"),
      do: from_config_file()
  end

  def config_file() do
    filename = Path.join([System.user_home!(), ".forge", "config.yml"])
    case YamlElixir.read_from_file(filename) do
      {:ok, conf} -> conf
      _ -> nil
    end
  end

  defp from_config_file() do
    with %{"token" => token} <- config_file(),
      do: token
  end
end
