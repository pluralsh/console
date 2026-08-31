---
title: Code Fence
---

## Basic

````markdown {% title="One line, no props specified" %}
```
aws configure list
```
````

```
aws configure list
```

---

````markdown {% title="Multiple lines, no props specified" %}
```
[compute]
region = us-east1
zone = us-east1-b
[core]
account = yirenlu92@gmail.com
disable_usage_reporting = True
project = example-project-name
```
````

```
[compute]
region = us-east1
zone = us-east1-b
[core]
account = yirenlu92@gmail.com
disable_usage_reporting = True
project = example-project-name
```

---

````markdown {% title="Language specified" %}
```javascript
let x = 5 + 1
console.log(`x is ${x}`)
```
````

```javascript
let x = 5 + 1
console.log(`x is ${x}`)
```

---

````markdown {% title="languges 'shell', 'sh' and 'bash' hide header by default" %}
```shell
rm -rf node_modules
```
````

```shell
rm -rf node_modules
```

---

````markdown {% title="Force header to show up" %}
```shell {% showHeader=true %}
rm -rf node_modules
```
````

```shell {% showHeader=true %}
rm -rf node_modules
```

---

````markdown {% title="Specify a title (will display instead language)" %}
```shell {% title="Run this command" showHeader=true %}
rm -rf node_modules
```
````

```shell {% title="Run this command" showHeader=true %}
rm -rf node_modules
```

---

````markdown {% title="Force header to hide" %}
```elixir {% showHeader=false %}
IO.puts("Hello world from Elixir")
```
````

```elixir {% showHeader=false %}
IO.puts("Hello world from Elixir")
```
