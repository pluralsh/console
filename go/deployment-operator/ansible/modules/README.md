# Plural Ansible Module

A custom Ansible module for managing Plural CD clusters. This module allows you to bootstrap new clusters and delete existing ones directly from your Ansible playbooks, providing a seamless integration with your infrastructure automation workflows.

## Parameters

### Common

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `command` | `str` | yes | — | Subcommand to run: `bootstrap` or `delete` |
| `kubeconfig` | `path` | no | `/etc/kubernetes/admin.conf` | Path to kubeconfig on the remote node |
| `local_binary` | `path` | no | `/usr/local/bin/plural` | Path to the `plural` binary on the controller |
| `env_vars` | `dict` | no | — | Extra env vars to pass to the command (overrides controller env) |

### Bootstrap (`command: bootstrap`)

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `cluster_name` | `str` | yes | — | Name of the cluster to register |
| `handle` | `str` | no | — | Unique human-readable cluster handle |
| `values` | `path` | no | — | Path to helm values file for the deployment agent |
| `chart_loc` | `str` | no | — | URL or filepath of the helm chart tar file |
| `project` | `str` | no | — | Project the cluster will belong to |
| `tags` | `list[str]` | no | — | List of `key=value` tags |
| `metadata` | `str` | no | — | Raw YAML block of metadata to pass to the cluster |

### Delete (`command: delete`)

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `cluster_handle` | `str` | yes | — | Handle of the cluster to delete |
| `soft` | `bool` | no | `false` | Detach without draining workloads |

## Examples

### Basic bootstrap

```yaml
- name: Bootstrap cluster
  plural:
    command: bootstrap
    cluster_name: my-cluster
```

### Bootstrap with all options

```yaml
- name: Bootstrap cluster
  plural:
    command: bootstrap
    cluster_name: my-cluster
    handle: my-handle
    project: my-project
    chart_loc: https://example.com/charts/agent-0.1.0.tgz
    values: /plural/agent-values.yaml
    tags:
      - env=production
      - team=platform
    metadata: |
      annotations:
        foo: bar
      labels:
        env: production
```

### Bootstrap using a variable from inventory

```yaml
- name: Bootstrap cluster
  plural:
    command: bootstrap
    cluster_name: "{{ plural_cluster_name }}"
```

Where `plural_cluster_name` is defined in the inventory under `[kube_control_plane:vars]`:

```ini
[kube_control_plane:vars]
plural_cluster_name=my-cluster
```

### Hard delete

```yaml
- name: Delete cluster
  hosts: all
  gather_facts: false
  plural:
    command: delete
    cluster_handle: "@my-cluster"
```

### Soft delete (detach without draining)

```yaml
- name: Detach cluster
  hosts: all
  gather_facts: false
  plural:
    command: delete
    cluster_handle: "@my-cluster"
    soft: true
```

### Override credentials explicitly

```yaml
- name: Bootstrap cluster
  plural:
    command: bootstrap
    cluster_name: my-cluster
    env_vars:
      PLURAL_CONSOLE_TOKEN: "{{ vault_console_token }}"
      PLURAL_CONSOLE_URL: "https://console.example.com"
```

### Full playbook example — bootstrap

```yaml
- import_playbook: cluster.yml

- name: Bootstrap Plural CD
  hosts: kube_control_plane[0]
  gather_facts: false
  tasks:
    - name: Bootstrap cluster
      plural:
        command: bootstrap
        cluster_name: "{{ plural_cluster_name }}"
```

### Full playbook example — delete

```yaml
- name: Delete Plural CD cluster
  hosts: kube_control_plane[0]
  gather_facts: false
  tasks:
    - name: Delete cluster
      plural:
        command: delete
        cluster_handle: "{{ plural_cluster_name }}"
```

> **Note:** every Ansible play must include a `hosts:` key. Omitting it causes a parser error (exit status 4).

## InfrastructureStack setup

The module is baked into the harness image at `/usr/share/plural/plugins/`.

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: ssh-key-secret
type: Opaque
data:
  ssh-privatekey: <base64-encoded-ssh-key>
---
apiVersion: deployments.plural.sh/v1alpha1
kind: GitRepository
metadata:
  name: ansible-kubespray
spec:
  url: https://github.com/kubernetes-sigs/kubespray.git
---
apiVersion: v1
kind: Secret
metadata:
  name: kubespray-ini
stringData:
  cluster.ini: |
    [kube_control_plane:vars]
    plural_cluster_name=ansible-kubespray

    [all]
    node1 ansible_host=18.199.164.138 ansible_user=ubuntu ansible_become=true ansible_ssh_private_key_file=/tmp/ssh-privatekey

    [kube_control_plane]
    node1

    [kube_node]
    node1

    [etcd]
    node1

    [k8s_cluster:children]
    kube_control_plane
    kube_node
    calico_rr

    [calico_rr]

---
apiVersion: v1
kind: Secret
metadata:
  name: ansible-cfg
stringData:
  ansible.cfg: |
    [defaults]
    deprecation_warnings = False
    command_warnings = False
---
apiVersion: v1
kind: Secret
metadata:
  name: bootstrap-yaml
stringData:
  bootstrap.yaml: |
    - import_playbook: cluster.yml

    - name: Bootstrap Plural CD
      hosts: kube_control_plane[0]
      gather_facts: false
      tasks:
        - name: Run plural bootstrap
          plural:
            command: bootstrap
            cluster_name: "{{ plural_cluster_name }}"

---
apiVersion: deployments.plural.sh/v1alpha1
kind: InfrastructureStack
metadata:
  name: ansible-kubespray
  namespace: default
spec:
  name: "ansible-kubespray"
  detach: true
  type: ANSIBLE
  actor: "test@plural.sh"
  configuration:
    version: "11.0"
    image: "ghcr.io/pluralsh/harness"
    ansible:
      playbook: "/plural/bootstrap.yaml"
      inventory: "/plural/cluster.ini"
      privateKeyFile: "/tmp/ssh-privatekey"
      configFile: "/plural/ansible.cfg"
  repositoryRef:
    name: ansible-kubespray
    namespace: default
  clusterRef:
    name: existing
    namespace: default
  git:
    ref: master
    folder: /
  files:
    - mountPath: /tmp
      secretRef:
        name: ssh-key-secret
    - mountPath: /plural
      secretRef:
        name: kubespray-ini
    - mountPath: /plural
      secretRef:
        name: ansible-cfg
    - mountPath: /plural
      secretRef:
        name: bootstrap-yaml
  environment:
    - name: ANSIBLE_ROLES_PATH
      value: /plural/roles:/plural/playboooks/roles:/plural/playbooks
```

