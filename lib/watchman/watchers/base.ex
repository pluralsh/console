defmodule Watchman.Watchers.Base do
  import Watchman.Services.Base
  def to_delta(:added), do: :create
  def to_delta(:modified), do: :update
  def to_delta(:deleted), do: :delete

  def publish(resource, type) do
    broadcast(resource, to_delta(type))
  end
end