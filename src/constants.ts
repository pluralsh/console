export const goCode = `package algorithms

func Reverse[T any](arr []T) []T {
  length := len(arr)
  res := make([]T, length)

  for ind, val := range arr {
    res[length-ind-1] = val
  }

  return res
}

func Map[T any, V any](arr []T, f func(T) V) []V {
  res := make([]V, len(arr))
  for ind, val := range arr {
    res[ind] = f(val)
  }

  return res
}

func Filter[T any](arr []T, f func(T) bool) []T {
  res := make([]T, 0)
  for _, v := range arr {
    if f(v) {
      res = append(res, v)
    }
  }

  return res
}

func Reduce[T any, V any](arr []T, acc V, f func(T, V) V) V {
  res := acc
  for _, v := range arr {
    res = f(v, res)
  }
  return res
}

func Index[T any](arr []T, f func(T) bool) int {
  for i, v := range arr {
    if f(v) {
      return i
    }
  }
  return -1
}`

export const jsCode = `export function* reverse(array, mapper = i => i) {
  for (let i = array.length - 1; i >= 0; i--) {
    yield mapper(array[i])
  }
}

export function* lookahead(array, mapper = i => i) {
  const len = array.length
  for (let i = 0; i < len; i++) {
    yield mapper(array[i], array[i + 1] || {})
  }
}

export function* chunk(array, chunkSize) {
  let i; let 
    j
  for (i = 0, j = array.length; i < j; i += chunkSize) {
    yield array.slice(i, i + chunkSize)
  }
}

export function groupBy(list, key = i => i.id) {
  const grouped = {}
  for (const item of list) {
    const k = key(item)
    const group = grouped[k] || []
    group.push(item)
    grouped[k] = group
  }

  return grouped
}

export function trimSuffix(str, suff) {
  if (str.endsWith(suff)) {
    return str.slice(0, str.length - suff.length)
  }

  return str
}`

export const tfCode = `resource "kubernetes_namespace" "console" {
  metadata {
    name = var.namespace

    labels = {
      "app.kubernetes.io/managed-by" = "plural"
      "app.plural.sh/name" = "console"
      "platform.plural.sh/sync-target" = "pg"
    }
  }
}

resource "kubernetes_service_account" "console" {
  metadata {
    name      = "console"
    namespace = var.namespace
    annotations = {
      "iam.gke.io/gcp-service-account" = module.console-workload-identity.gcp_service_account_email
    }
  }

  depends_on = [
    kubernetes_namespace.console
  ]
}

module "console-workload-identity" {
  source     = "terraform-google-modules/kubernetes-engine/google//modules/workload-identity"
  name       = "\${var.cluster_name}-console"
  namespace  = var.namespace
  project_id = var.project_id
  use_existing_k8s_sa = true
  annotate_k8s_sa = false
  k8s_sa_name = "console"
  roles = ["roles/owner", "roles/storage.admin"]
}`

export const rustCode = `// This is the main function
fn main() {
    // Statements here are executed when the compiled binary is called

    // Print text to the console
    println!("Hello World!");
}`

export const elixirCode = `defmodule Recursion do
def print_multiple_times(msg, n) when n > 0 do
  IO.puts(msg)
  print_multiple_times(msg, n - 1)
end

def print_multiple_times(_msg, 0) do
  :ok
end
end

Recursion.print_multiple_times("Hello!", 3)
# Hello!
# Hello!
# Hello!
:ok`

export const cCode = `// C program to store temperature of two cities of a week and display it.
#include <stdio.h>
const int CITY = 2;
const int WEEK = 7;
int main()
{
  int temperature[CITY][WEEK];

  // Using nested loop to store values in a 2d array
  for (int i = 0; i < CITY; ++i)
  {
    for (int j = 0; j < WEEK; ++j)
    {
      printf("City %d, Day %d: ", i + 1, j + 1);
      scanf("%d", &temperature[i][j]);
    }
  }
  printf("\nDisplaying values: \n\n");

  // Using nested loop to display vlues of a 2d array
  for (int i = 0; i < CITY; ++i)
  {
    for (int j = 0; j < WEEK; ++j)
    {
      printf("City %d, Day %d = %d\n", i + 1, j + 1, temperature[i][j]);
    }
  }
  return 0;
}
`
