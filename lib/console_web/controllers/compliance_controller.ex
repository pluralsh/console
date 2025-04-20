defmodule ConsoleWeb.ComplianceController do
  use ConsoleWeb, :controller
  alias Console.Schema.User
  alias Console.Schema.ComplianceReport
  alias Console.Compliance.Report

  def report(conn, %{"format" => fmt}) do
    with %User{} = user <- Guardian.Plug.current_resource(conn),
         {:ok, _} <- Report.allow(user),
         {:ok, fmt} <- format(fmt) do
      report = %ComplianceReport{name: ComplianceReport.name()}
      conn =
        conn
        |> put_resp_content_type("application/zip")
        |> put_resp_header("content-disposition","attachment; filename=\"#{report.name}.zip\"")
        |> send_chunked(200)

      {conn, sha} =
        Report.report(fmt)
        |> Enum.reduce_while({conn, :crypto.hash_init(:sha256)}, fn str, {conn, sha} ->
          case chunk(conn, str) do
            {:ok, conn} ->
              {:cont, {conn, :crypto.hash_update(sha, str)}}
            {:error, :closed} ->
              {:halt, {conn, :crypto.hash_update(sha, str)}}
          end
        end)

      sha = :crypto.hash_final(sha) |> Base.encode16(case: :lower)
      Console.Repo.insert!(%{report | sha256: sha})

      conn
    else
      _ -> send_resp(conn, 403, "Forbidden")
    end
  end

  defp format("csv"), do: {:ok, :csv}
  defp format(fmt), do: {:error, "invalid format #{fmt}"}
end
