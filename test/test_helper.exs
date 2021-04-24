{:ok, _} = Application.ensure_all_started(:mimic)

Mimic.copy(Console.Deployer)
Mimic.copy(Console.Storage.Git)
Mimic.copy(Console.Commands.Plural)
Mimic.copy(Console.Commands.Command)
Mimic.copy(Console.Plural.Repositories)
Mimic.copy(Console.Plural.Incidents)
Mimic.copy(Mojito)
Mimic.copy(Kazan)
Mimic.copy(HTTPoison)
Mimic.copy(Kazan.Watcher)

ExUnit.start()
Ecto.Adapters.SQL.Sandbox.mode(Console.Repo, :manual)

{:ok, _} = Application.ensure_all_started(:ex_machina)
