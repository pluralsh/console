defmodule Watchman.MixProject do
  use Mix.Project

  @vsn File.read!("VERSION")

  def project do
    [
      app: :watchman,
      version: @vsn,
      build_path: "_build",
      config_path: "config/config.exs",
      deps_path: "deps",
      lockfile: "mix.lock",
      elixir: "~> 1.9",
      elixirc_paths: elixirc_paths(Mix.env()),
      compilers: [:phoenix, :gettext] ++ Mix.compilers(),
      start_permanent: Mix.env() == :prod,
      deps: deps(),
      aliases: aliases()
    ]
  end

  defp elixirc_paths(:test), do: ["lib", "test/support"]
  defp elixirc_paths(_), do: ["lib"]

  # Run "mix help compile.app" to learn about applications.
  def application do
    [
      mod: {Watchman.Application, []},
      extra_applications: [:logger, :runtime_tools]
    ]
  end

  # Run "mix help deps" to learn about dependencies.
  defp deps do
    [
      {:ecto, "~> 3.4.3", override: true},
      {:ex_machina, "~> 2.3", only: :test},
      {:distillery, "~> 2.1"},
      {:libcluster, "~> 3.2"},
      {:horde, "~> 0.8"},
      {:postgrex, ">= 0.0.0"},
      {:phoenix, "~> 1.4.9"},
      {:phoenix_pubsub, "~> 1.1"},
      {:phoenix_ecto, "~>4.0"},
      {:ecto_sql, "~> 3.4.5"},
      {:piazza_core, "~> 0.3.1"},
      {:flow, "~> 0.15.0"},
      {:bourne, "~> 1.1"},
      {:phoenix_html, "~> 2.11"},
      {:phoenix_live_reload, "~> 1.2", only: :dev},
      {:gettext, "~> 0.11"},
      {:jason, "~> 1.0"},
      {:plug_cowboy, "~> 2.0"},
      {:porcelain, "~> 2.0"},
      {:absinthe, "~> 1.5.3"},
      {:absinthe_relay, "~> 1.5"},
      {:absinthe_plug, "~> 1.5"},
      {:absinthe_phoenix, "~> 1.5"},
      {:dataloader, "~> 1.0.6"},
      {:cors_plug, "~> 2.0"},
      {:timex, "~> 3.6"},
      {:quantum, "~> 2.3"},
      {:yaml_elixir, "~> 2.4"},
      {:poison, "~> 3.1"},
      {:mojito, "~> 0.3.0"},
      {:reverse_proxy_plug, "~> 1.2.1"},
      {:kazan, "~> 0.11", github: "michaeljguarino/kazan"},
      {:comeonin, "~> 5.1.2"},
      {:argon2_elixir, "~> 2.0"},
      {:prometheus_ex, "~> 3.0"},
      {:prometheus_plugs, "~> 1.1.1"},
      {:guardian, "~> 1.2.1"},
      {:httpoison, "~> 1.7"},
      {:nebulex, "2.0.0-rc.1"},
      {:shards, "~> 1.0"},      #=> For using :shards as backend
      {:decorator, "~> 1.3"},   #=> For using Caching Annotations
      {:telemetry, "~> 0.4"},
      {:apq, "~> 1.2"},
      {:evel, "~> 0.1"},
      {:phoenix_client, "~> 0.11", git: "https://github.com/michaeljguarino/phoenix_client.git", branch: "mguarino/channel-listen"},
      {:botanist, "~> 0.1.0", git: "https://github.com/michaeljguarino/botanist.git", branch: "ecto3"},
      {:mimic, "~> 1.1", only: :test}
    ]
  end

  defp aliases do
    [
      "ecto.setup": ["ecto.create", "ecto.migrate", "run priv/repo/seeds.exs"],
      "ecto.reset": ["ecto.drop", "ecto.setup"],
      test: ["ecto.create --quiet", "ecto.migrate", "test"]
    ]
  end
end
