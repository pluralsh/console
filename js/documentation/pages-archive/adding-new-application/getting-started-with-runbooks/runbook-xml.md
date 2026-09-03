---
title: XML Runbooks
description: Creating a Plural runbook from XML.
---

#### XML Tag Definitions

Plural runbooks are written in XML. XML doesn’t have a predefined markup language, like HTML does. Instead, XML allows users to create their own markup symbols to describe content, making an unlimited and self-defining symbol set.

We have defined the following xml attributes in an Elixir file that may be used in the creation of your own runbooks and help standardize their layout.&#x20;

```Elixir
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
      attributes ~w(placeholder name label datatype)
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
```

Most of these attributes, like `box` and `input` are basically grommet React components. However, we would like to call out a few custom attributes that interact with other data from the runbook. They each refer to a datasource and then maybe also a way to access a value at that datasource.

- **`timeseries`**
  - `datasource`
- **`valueFrom`**
  - `datasource`
  - `doc`
  - `path`

Here is an example Runbook XML template composed of these attributes.

```xml
<root gap='medium'>
  <box pad='small' gap='medium' direction='row' align='center'>
    <button label='Scale' action='scale' primary='true' headline='true' />
    <box direction='row' align='center' gap='small'>
      <box gap='small' align='center'>
        <timeseries datasource="cpu" label="CPU Usage" />
        <text size='small'>You should set a reservation to
          roughly correspond to 30% utilization</text>
      </box>
      <box gap='small' align='center'>
        <timeseries datasource="memory" label="Memory Usage" />
        <text size='small'>You should set a reservation to
          roughly correspond to 60% utilization</text>
      </box>
    </box>
    <box gap='small'>
      <box gap='xsmall'>
        <input placeholder="250m" label='CPU Request' name='cpu'>
          <valueFrom
            datasource="statefulset"
            doc="kubernetes.raw"
            path="spec.template.spec.containers[0].resources.requests.cpu" />
        </input>
        <input placeholder="1Gi" label='Memory Request' name='memory'>
          <valueFrom
            datasource="statefulset"
            doc="kubernetes.raw"
            path="spec.template.spec.containers[0].resources.requests.memory" />
        </input>
      </box>
    </box>
  </box>
  <box pad='small' gap='medium' direction='row' align='center'>
    <box direction='row' width='70%' align='center'>
      <text size='small'>You can also add more replicas to provide failover in case of outages, or optionally remove them to save cost</text>
    </box>
    <box direction='row' gap='small' width='30%' align='center'>
      <input datatype='int' placeholder="1" label='Replicas' name='replicas'>
        <valueFrom
          datasource="statefulset"
          doc="kubernetes.raw"
          path="spec.replicas" />
      </input>
    </box>
  </box>
  <box width='100%' gap='small'>
    <text size='small'>Be sure to scale your rabbitmq nodes within your nodes capacities, listed here:</text>
    <table width='100%' datasource='nodes' path='nodes'>
      <tableColumn path='metadata.name' header='name' width='33%' />
      <tableColumn path='status.capacity.cpu' header='cpu' width='33%' />
      <tableColumn path='status.capacity.memory' header='memory' width='33%' />
    </table>
  </box>
</root>
```

This XML file is referred to in the `runbooks.yaml` file, where you will also pass along the datasources that will hydrate this template.&#x20;
