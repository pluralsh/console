{:ok, _} = Application.ensure_all_started(:mimic)

Mimic.copy(Watchman.Deployer)
Mimic.copy(Watchman.Storage.Git)
Mimic.copy(Watchman.Commands.Forge)
Mimic.copy(Watchman.Commands.Command)
Mimic.copy(Watchman.Forge.Repositories)
Mimic.copy(Watchman.Forge.Incidents)
Mimic.copy(Mojito)
Mimic.copy(Kazan)
Mimic.copy(HTTPoison)
Mimic.copy(Kazan.Watcher)

ExUnit.start()
Ecto.Adapters.SQL.Sandbox.mode(Watchman.Repo, :manual)

{:ok, _} = Application.ensure_all_started(:ex_machina)
