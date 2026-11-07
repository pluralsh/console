defmodule Mix.Tasks.Console.Email.Preview do
  @moduledoc """
  Exports every email (html + text) in each fixture variant for client testing.

      mix console.email.preview [output dir, default tmp/email-previews]
  """
  @shortdoc "Exports rendered email previews"
  use Mix.Task

  def run(args) do
    Mix.Task.run("compile")
    dir = List.first(args) || "tmp/email-previews"

    Console.Email.Preview.export(dir)
    |> Enum.each(&Mix.shell().info("wrote #{&1}"))
  end
end
