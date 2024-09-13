defmodule Console.MixProject do
  use Mix.Project

  defp version do
    case :file.consult('hex_metadata.config') do
      {:ok, data} ->
        {"version", version} = List.keyfind(data, "version", 0)
        version
      _ ->
        version =
          case System.cmd("git", ~w[describe --dirty=+dirty]) do
            {"go/client/" <> _, 0} -> "0.0.0"
            {version, 0} ->
              String.trim_leading(String.trim(version), "v")

            {_, code} ->
              Mix.shell().error("Git exited with code #{code}, falling back to 0.0.0")

              "0.0.0"
          end

        case Version.parse(version) do
          {:ok, %Version{pre: ["pre" <> _ | _]} = version} ->
            to_string(version)

          {:ok, %Version{pre: []} = version} ->
            to_string(version)

          {:ok, %Version{patch: patch, pre: pre} = version} ->
            to_string(%{version | patch: patch + 1, pre: ["dev" | pre]})

          :error ->
            Mix.shell().error("Failed to parse #{version}, falling back to 0.0.0")

            "0.0.0"
        end
    end
  end

  def project do
    [
      app: :console,
      version: version(),
      build_path: "_build",
      config_path: "config/config.exs",
      deps_path: "deps",
      lockfile: "mix.lock",
      elixir: "~> 1.12",
      elixirc_paths: elixirc_paths(Mix.env()),
      compilers: Mix.compilers(),
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
      mod: {Console.Application, []},
      extra_applications: [:logger, :runtime_tools, :ssh]
    ]
  end

  # Run "mix help deps" to learn about dependencies.
  defp deps do
    [
      {:ecto, "~> 3.9.0", override: true},
      {:ex_machina, "~> 2.3", only: :test},
      {:distillery, "~> 2.1"},
      {:libcluster, "~> 3.2"},
      {:horde, "~> 0.8"},
      {:crontab, "~> 1.1"},
      {:tentacat, "~> 2.0"},
      {:absinthe_client, "~> 0.1.0"},
      {:postgrex, ">= 0.0.0"},
      {:phoenix, "~> 1.5"},
      {:phoenix_view, "~> 2.0"},
      {:openid_connect, "~> 0.2.2", git: "https://github.com/pluralsh/openid_connect", commit: "58bda539debd81dc1a253139ae9b5cbbd65c8047q"},
      {:phoenix_pubsub, "~> 2.0"},
      {:phoenix_ecto, "~>4.0"},
      {:ecto_sql, "~> 3.9.0"},
      {:yajwt, "~> 1.4"},
      {:joken, "~> 2.6"},
      {:piazza_core, "~> 0.3.9", git: "https://github.com/michaeljguarino/piazza_core", branch: "master", override: true},
      {:flow, "~> 0.15.0"},
      {:bourne, "~> 1.1"},
      {:phoenix_html, "~> 2.11"},
      {:parallel_task, "~> 0.1.0"},
      {:phoenix_live_reload, "~> 1.2", only: :dev},
      {:gettext, "~> 0.11"},
      {:jason, "~> 1.0"},
      {:plug_cowboy, "~> 2.0"},
      {:uniq, "~> 0.4"},
      {:mix_audit, "~> 2.0", only: [:dev, :test], runtime: false},
      {:sobelow, "~> 0.8", only: [:dev, :test]},
      {:porcelain, "~> 2.0"},
      {:absinthe, "~> 1.7.5"},
      {:absinthe_relay, "~> 1.5.2"},
      {:absinthe_plug, "~> 1.5", git: "https://github.com/absinthe-graphql/absinthe_plug.git", commit: "3a984cc341ebb32c79e7ae58b4ebd116d5c62f9e", override: true},
      {:absinthe_phoenix, "~> 2.0"},
      {:dataloader, "~> 1.0.6"},
      {:cors_plug, "~> 2.0"},
      {:timex, "~> 3.7"},
      {:quantum, "~> 3.0"},
      {:swarm, "~> 3.0"},
      {:bandit, "~> 1.0"},
      {:yaml_elixir, "~> 2.9"},
      {:poison, "~> 5.0", override: true},
      {:ets, "~> 0.9"},
      {:reverse_proxy_plug, "~> 1.2.1"},
      {:kazan, "~> 0.11", github: "michaeljguarino/kazan", ref: "ef2050c547ab74c283ef02397925d48637bd67a1"},
      {:comeonin, "~> 5.1.2"},
      {:argon2_elixir, "~> 2.0"},
      {:prometheus_ex, "~> 3.0"},
      {:prometheus_plugs, "~> 1.1.1"},
      {:prometheus_ecto, "~> 1.4.3"},
      {:guardian, "~> 1.2.1"},
      {:httpoison, "~> 1.7", override: true},
      {:nebulex, "~> 2.6"},
      {:shards, "~> 1.0"},      #=> For using :shards as backend
      {:decorator, "~> 1.3"},   #=> For using Caching Annotations
      {:telemetry, "~> 0.4"},
      {:apq, "~> 1.2"},
      {:evel, "~> 0.1"},
      {:deep_merge, "~> 1.0"},
      {:ymlr, "~> 2.0"},
      {:remote_ip, "~> 0.2.0"},
      {:erlsom, "~> 1.4"},
      {:inflex, "~> 2.0.0"},
      {:websockex, "~> 0.4.3"},
      {:briefly, "~> 0.5.0"},
      {:libring, "~> 1.0"},
      {:http_stream, "~> 1.0.0"},
      {:solid, "~> 0.15"},
      {:x509, "~> 0.8.5"},
      {:bamboo_phoenix, "~> 1.0"},
      {:bamboo_smtp, "~> 4.1.0"},
      {:bamboo, "~> 2.3", override: true},
      {:hut, "~> 1.3", manager: :rebar3, override: true},

      # if using the Mint adapter:
      {:castore, "~> 0.1.7"},
      {:req, "~> 0.4.14", override: true},
      {:mint, "~> 1.4.0", override: true},
      {:phoenix_client, "~> 0.11", git: "https://github.com/michaeljguarino/phoenix_client.git", branch: "mguarino/channel-listen"},
      {:botanist, "~> 0.1.0", git: "https://github.com/michaeljguarino/botanist.git", branch: "ecto3"},
      {:elixpath, "~> 0.1.1", git: "https://github.com/mtannaan/elixpath.git"},
      {:mimic, "~> 1.1", only: :test},
      {:hammer, "~> 6.0"},
      {:hammer_plug, "~> 3.0", git: "https://github.com/pluralsh/hammer-plug.git", branch: "runtime-config"}
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
