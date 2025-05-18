defmodule Console.PromEx do
  use PromEx, otp_app: :console

  alias PromEx.Plugins

  @impl true
  def plugins do
    [
      # PromEx built in plugins
      Plugins.Application,
      Plugins.Beam,
      {Plugins.Phoenix, router: ConsoleWeb.Router, endpoint: ConsoleWeb.Endpoint},
      Plugins.Ecto,
      # Plugins.Oban,
      # Plugins.PhoenixLiveView,
      Plugins.Absinthe,
      # Plugins.Broadway,
    ] ++ Console.conf(:prom_plugins)
  end

  @impl true
  def dashboard_assigns do
    [
      datasource_id: "plural_console",
      default_selected_interval: "30s"
    ]
  end

  @impl true
  def dashboards do
    [
      # PromEx built in Grafana dashboards
      {:prom_ex, "application.json"},
      {:prom_ex, "beam.json"}
      # {:prom_ex, "phoenix.json"},
      # {:prom_ex, "ecto.json"},
      # {:prom_ex, "oban.json"},
      # {:prom_ex, "phoenix_live_view.json"},
      # {:prom_ex, "absinthe.json"},
      # {:prom_ex, "broadway.json"},

      # Add your dashboard definitions here with the format: {:otp_app, "path_in_priv"}
      # {:console, "/grafana_dashboards/user_metrics.json"}
    ]
  end
end
