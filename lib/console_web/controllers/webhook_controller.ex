defmodule ConsoleWeb.WebhookController do
  use ConsoleWeb, :controller
  alias Alertmanager.Alert
  alias Console.Services.{Builds, Users, Alertmanager}

  plug ConsoleWeb.Verifier when action == :webhook
  plug ConsoleWeb.PiazzaVerifier when action == :piazza

  def webhook(conn, params) do
    bot = Users.get_bot!("console")
    with {:ok, _} <- Builds.create(params, bot),
      do: json(conn, %{ok: true})
  end

  def alertmanager(conn, %{"alerts" => alerts}) when is_list(alerts) do
    Enum.each(alerts, fn alert ->
      Alert.build(alert)
      |> Alertmanager.handle_alert()
    end)

    json(conn, %{ok: true})
  end

  def alertmanager(conn, _payload) do
    json(conn, %{ok: true})
  end

  def piazza(conn, %{"text" => "/console deploy " <> application}) do
    bot = Users.get_bot!("console")
    case Builds.create(%{type: :deploy, repository: application, message: "Deployed from piazza"}, bot) do
      {:ok, _} -> json(conn, %{"text" => "deploying #{application}"})
      _ -> json(conn, %{"text" => "hmm, something went wrong"})
    end
  end
  def piazza(conn, _), do: json(conn, %{"text" => "I don't understand what you're asking"})
end
