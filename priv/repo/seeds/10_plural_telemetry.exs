import Botanist

alias Console.Deployments.Init

# only plant when enabled so the seed stays unrecorded and reruns once the flag is flipped on
if Console.plural_o11y?() do
  seed do
    case Init.migrate_plural_telemetry() do
      {:error, err} when is_binary(err) -> {:error, err}
      {:error, err} -> {:error, inspect(err)}
      res -> res
    end
  end
end
