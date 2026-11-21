defmodule Console.Devboxes.Names do
  @moduledoc """
  Readable `adjective-noun` names for devbox instances (e.g. `brisk-otter`), used when the user doesn't name one.
  """

  @adjectives ~w(
    amber ancient autumn bold brave breezy bright brisk calm careful cheery clever cosmic crisp curious dapper
    daring dawn deep dusty eager early easy electric elegant fancy fearless fierce flying fresh frosty gentle
    giant gleaming golden graceful grand happy hidden hollow humble icy jolly keen kind lively lucky lunar
    magic mellow merry misty modest nimble noble patient plucky polished proud quick quiet rapid rare restless
    rustic sandy shiny silent silver simple sleepy smooth snowy solar spry steady stormy sturdy sunny swift
    tidy tiny tranquil twilight velvet vivid wandering warm wild windy wise witty young zesty
  )

  @nouns ~w(
    acorn badger beacon bison breeze brook canyon cedar comet coral cosmos crane creek cricket dolphin dune
    eagle ember falcon fern finch fjord fox galaxy gecko glacier grove harbor hawk heron horizon island
    jaguar kestrel koala lagoon lantern lark lemur lynx maple meadow meteor moose moth nebula newt oak ocean
    orchid osprey otter owl panda pebble pelican pine planet pond prairie puffin quartz raven reef ridge
    river robin sequoia shore sparrow spruce squirrel star summit swan thicket thistle tiger tundra valley
    walrus willow wolf wren yak zephyr
  )

  @attempts 10

  @doc "Generates a name, avoiding any in `taken` when it can within a few attempts."
  @spec generate(Enumerable.t) :: binary
  def generate(taken \\ []) do
    taken = MapSet.new(taken)
    Stream.repeatedly(&random/0)
    |> Stream.take(@attempts)
    |> Enum.find(&!MapSet.member?(taken, &1))
    |> case do
      nil -> "#{random()}-#{:rand.uniform(900) + 99}"
      name -> name
    end
  end

  defp random(), do: "#{Enum.random(@adjectives)}-#{Enum.random(@nouns)}"
end
