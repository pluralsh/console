defmodule Console.MixProject do
  use Mix.Project

  defp version do
    case :file.consult(~c"hex_metadata.config") do
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
      elixir: "~> 1.16",
      elixirc_paths: elixirc_paths(Mix.env()),
      compilers: Mix.compilers(),
      start_permanent: Mix.env() == :prod,
      deps: deps(),
      aliases: aliases(),
      releases: [
        console: [
          include_executables_for: [:unix],
          runtime_config_path: "rel/runtime.exs",
          applications: [
            runtime_tools: :permanent,
            console: :permanent
          ]
        ]
      ]
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
      {:ecto, "~> 3.12.0", override: true},
      {:ex_machina, "~> 2.8", only: :test},
      {:libcluster, "~> 3.4"},
      {:ex_aws, "~> 2.1"},
      {:ex_aws_sts, "~> 2.3.0"},
      {:configparser_ex, "~> 4.0"},
      {:crontab, "~> 1.1"},
      {:tentacat, "~> 2.0"},
      {:absinthe_client, "~> 0.1.0"},
      {:postgrex, ">= 0.0.0"},
      {:grpc, "~> 0.10"},
      {:phoenix, "~> 1.5"},
      {:phoenix_view, "~> 2.0"},
      {:phoenix_pubsub, "~> 2.0"},
      {:phoenix_ecto, "~> 4.0"},
      {:ecto_sql, "~> 3.12.0"},
      # {:ecto_sqlite3, "~> 0.17"},
      {:yajwt, "~> 1.4"},
      {:joken, "~> 2.6"},
      {:mdex, "~> 0.1"},
      {:absinthe_graphql_ws, "~> 0.3"},
      {:prom_ex, "~> 1.11.0"},
      {:telemetry_poller, "~> 1.1"},
      {:cowboy_telemetry, "~> 0.4"},
      {:telemetry_registry, "~> 0.3"},
      {:snap, "~> 0.11"},
      {:finch, "~> 0.19"},
      {:hermes_mcp, "~> 0.3.12"},
      {:piazza_core, "~> 0.3.9", git: "https://github.com/michaeljguarino/piazza_core", commit: "2a91145d0d567f1aab40d52843d77dfb491c424a", override: true},
      {:flow, "~> 1.2"},
      {:gen_stage, "~> 1.0", override: true},
      {:bourne, "~> 1.1"},
      {:tiktoken, "~> 0.3"},
      {:phoenix_html, "~> 2.11"},
      {:parallel_task, "~> 0.1.0"},
      {:phoenix_live_reload, "~> 1.2", only: :dev},
      {:gettext, "~> 0.11"},
      {:jason, "~> 1.0"},
      {:plug_cowboy, "~> 2.7"},
      {:cowboy, "~> 2.12"},
      {:uniq, "~> 0.4"},
      {:rustler, "~> 0.32", override: true},
      {:mix_audit, "~> 2.0", only: [:dev, :test], runtime: false},
      {:sobelow, "~> 0.8", only: [:dev, :test]},
      {:absinthe, "~> 1.7.5"},
      {:absinthe_relay, "~> 1.5.2"},
      {:absinthe_plug, "~> 1.5", git: "https://github.com/absinthe-graphql/absinthe_plug.git", commit: "3a984cc341ebb32c79e7ae58b4ebd116d5c62f9e", override: true},
      {:absinthe_phoenix, "~> 2.0"},
      {:dataloader, "~> 2.0"},
      {:cors_plug, "~> 2.0"},
      {:timex, "~> 3.7"},
      {:zstream, "~> 0.6"},
      {:csv, "~> 3.2"},
      {:yaml_elixir, "~> 2.9"},
      {:google_api_ai_platform, "~> 0.22.0"},
      {:goth, "~> 1.4", git: "https://github.com/pluralsh/goth.git", branch: "plrl-cleanup", commit: "4958159d1e9acec2154590ecacc732ecd58f8312"},
      {:poison, "~> 6.0", override: true},
      {:ets, "~> 0.9"},
      {:reverse_proxy_plug, "~> 3.0"},
      {:kazan, "~> 0.11", github: "michaeljguarino/kazan", ref: "ef2050c547ab74c283ef02397925d48637bd67a1"},
      {:comeonin, "~> 5.3"},
      {:argon2_elixir, "~> 4.1"},
      {:nimble_parsec, "~> 1.4", override: true},
      {:guardian, "~> 2.3"},
      {:accessible, "~> 0.3.0"},
      {:httpoison, "~> 1.7", override: true},
      {:nebulex, "~> 2.6"},
      {:shards, "~> 1.0"},      #=> For using :shards as backend
      {:decorator, "~> 1.3"},   #=> For using Caching Annotations
      {:telemetry, "~> 1.0"},
      {:apq, "~> 2.0"},
      {:evel, "~> 0.1"},
      {:deep_merge, "~> 1.0"},
      {:ymlr, "~> 2.0"},
      {:remote_ip, "~> 1.2.0"},
      {:erlsom, "~> 1.5.1"},
      {:inflex, "~> 2.0.0"},
      {:websockex, "~> 0.4.3"},
      {:briefly, "~> 0.5.0"},
      {:libring, "~> 1.7"},
      {:http_stream, "~> 1.0.0"},
      {:solid, "~> 1.0.0-rc.0"},
      {:x509, "~> 0.8.5"},
      {:bamboo_phoenix, "~> 1.0"},
      {:slipstream, "~> 1.0"},
      {:bamboo_smtp, "~> 4.2"},
      {:bamboo, "~> 2.3", override: true},
      {:hut, "~> 1.3", manager: :rebar3, override: true},
      {:ex_doc, "~> 0.16", only: :dev, runtime: false, override: true},
      {:tesla, "~> 1.13"},
      {:oidcc, "~> 3.3"},
      {:hackney, "== 1.20.1"},

      # if using the Mint adapter:
      {:castore, "~> 1.0", override: true},
      {:req, "~> 0.5", override: true},
      {:mint, "~> 1.6", override: true},
      {:botanist, "~> 0.1.0", git: "https://github.com/michaeljguarino/botanist.git", branch: "ecto3"},
      {:elixpath, "~> 0.1.1", git: "https://github.com/mtannaan/elixpath.git"},
      {:mimic, "~> 1.11", only: :test},
      {:hammer, "~> 6.0"},
      {:hammer_plug, "~> 3.0", git: "https://github.com/pluralsh/hammer-plug.git", branch: "runtime-config"}
    ]
  end

  defp aliases do
    [
      "ecto.setup": ["ecto.create", "ecto.migrate", "run priv/repo/seeds.exs"],
      "ecto.reset": ["ecto.drop", "ecto.setup"],
      test: ["ecto.create --quiet", "agent.chart", "ecto.migrate", "elasticsearch.down", "elasticsearch.up", "test"]
    ]
  end
end
