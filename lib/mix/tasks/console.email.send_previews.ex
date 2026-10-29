defmodule Mix.Tasks.Console.Email.SendPreviews do
  @moduledoc """
  Sends every email preview through an smtp server, eg a Mailtrap sandbox inbox or the
  seed addresses of a Litmus / Email on Acid test.

      SMTP_SERVER=sandbox.smtp.mailtrap.io SMTP_PORT=2525 SMTP_USER=... SMTP_PASSWORD=... \\
        EMAIL_TO=inbox@example.com mix console.email.send_previews [name filter]

  `EMAIL_TO` accepts a comma separated list, `EMAIL_FROM` defaults to notifications@plural.sh.
  The optional filter only sends previews whose name contains it, eg `digest` or `-long`.
  """
  @shortdoc "Sends rendered email previews over smtp"
  use Mix.Task

  def run(args) do
    Mix.Task.run("compile")
    {:ok, _} = Application.ensure_all_started(:gen_smtp)
    filter = List.first(args) || ""
    config = smtp_config()
    to = env!("EMAIL_TO") |> String.split(",", trim: true) |> Enum.map(&String.trim/1)
    from = System.get_env("EMAIL_FROM", "notifications@plural.sh")

    Console.Email.Preview.all()
    |> Enum.filter(&String.contains?(&1.name, filter))
    |> Enum.each(fn preview ->
      Swoosh.Email.new(to: to, from: {"Plural.sh", from}, subject: preview.subject)
      |> Swoosh.Email.html_body(preview.html)
      |> Swoosh.Email.text_body(preview.text)
      |> Swoosh.Adapters.SMTP.deliver(config)
      |> case do
        {:ok, _} -> Mix.shell().info("sent #{preview.name}")
        err -> Mix.shell().error("failed to send #{preview.name}: #{inspect(err)}")
      end
    end)
  end

  defp smtp_config() do
    [
      relay: env!("SMTP_SERVER"),
      port: String.to_integer(System.get_env("SMTP_PORT", "587")),
      username: env!("SMTP_USER"),
      password: env!("SMTP_PASSWORD"),
      ssl: System.get_env("SMTP_SSL") == "true",
      tls: :if_available,
      auth: :if_available,
      tls_options: [verify: :verify_none]
    ]
  end

  defp env!(name) do
    case System.get_env(name) do
      val when is_binary(val) and val != "" -> val
      _ -> Mix.raise("#{name} must be set")
    end
  end
end
