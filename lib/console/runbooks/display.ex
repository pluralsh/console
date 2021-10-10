defmodule Console.Runbooks.Display do
  use Console.Runbooks.Display.Base
  alias Console.Runbooks.Display.{Xml}

  schema do
    component "box" do
      attributes ~w(direction width height pad margin align justify gap fill color border borderSide borderSize)
      parents ~w(root box)
    end

    component "text" do
      attributes ~w(size weight value color)
      parents ~w(box text root link)
    end

    component "markdown" do
      attributes ~w(size weight value)
      parents ~w(box text root)
    end

    component "button" do
      attributes ~w(primary label href target action headline)
      parents ~w(box)
    end

    component "input" do
      attributes ~w(placeholder name label)
      parents ~w(box)
    end

    component "timeseries" do
      attributes ~w(label datasource)
      parents ~w(box)
    end

    component "valueFrom" do
      attributes ~w(datasource path doc)
      parents ~w(input text)
    end

    component "image" do
      attributes ~w(width height url)
      parents ~w(box link)
    end

    component "video" do
      attributes ~w(width height url autoPlay loop)
      parents ~w(box link)
    end

    component "link" do
      attributes ~w(href target value color weight)
      parents ~w(text box)
    end

    component "table" do
      attributes ~w(name width height datasource path)
      parents ~w(box)
    end

    component "tableColumn" do
      attributes ~w(path header width)
      parents ~w(table)
    end
  end

  def parse_doc(xml) do
    with {:ok, parsed} <- Xml.from_xml(xml) do
      case validate(parsed) do
        :pass -> {:ok, parsed}
        {:fail, error} -> {:error, error}
      end
    end
  end
end
