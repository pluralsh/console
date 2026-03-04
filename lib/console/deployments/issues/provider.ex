defmodule Console.Deployments.Issues.Provider do
  @callback status(map) :: :open | :in_progress | :cancelled | :completed
  @callback title(map) :: binary
  @callback body(map) :: binary
  @callback external_id(map) :: binary
  @callback url(map) :: binary
end
