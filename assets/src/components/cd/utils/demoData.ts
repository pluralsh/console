export const DEMO_CLUSTERS = [
  {
    __typename: 'ClusterEdge',
    node: {
      __typename: 'Cluster',
      apiDeprecations: [],
      currentVersion: '1.25.14',
      deletedAt: null,
      handle: 'main-cluster',
      id: 'aaaa',
      installed: true,
      name: 'main-cluster',
      nodeMetrics: [
        {
          __typename: 'NodeMetric',
          usage: {
            __typename: 'NodeUsage',
            cpu: '4000000000n',
            memory: '10000000Ki',
          },
        },
      ],
      nodes: [
        {
          __typename: 'Node',
          status: {
            __typename: 'NodeStatus',
            capacity: {
              cpu: '2',
              'ephemeral-storage': '47227284Ki',
              'hugepages-1Gi': '0',
              'hugepages-2Mi': '0',
              memory: '8145588Ki',
              pods: '110',
            },
          },
        },
        {
          __typename: 'Node',
          status: {
            __typename: 'NodeStatus',
            capacity: {
              cpu: '2',
              'ephemeral-storage': '47227284Ki',
              'hugepages-1Gi': '0',
              'hugepages-2Mi': '0',
              memory: '8145588Ki',
              pods: '110',
            },
          },
        },
        {
          __typename: 'Node',
          status: {
            __typename: 'NodeStatus',
            capacity: {
              cpu: '2',
              'ephemeral-storage': '47227284Ki',
              'hugepages-1Gi': '0',
              'hugepages-2Mi': '0',
              memory: '8145588Ki',
              pods: '110',
            },
          },
        },
      ],
      pingedAt: '3000-11-09T17:11:51.438277Z',
      protect: true,
      provider: {
        __typename: 'ClusterProvider',
        cloud: 'aws',
        id: 'bbbb',
        name: 'aws',
        namespace: 'bootstrap',
        supportedVersions: ['1.28.1'],
      },
      self: true,
      service: null,
      status: {
        __typename: 'ClusterStatus',
        conditions: [
          {
            __typename: 'ClusterCondition',
            lastTransitionTime: '2023-11-03T18:49:25Z',
            message: null,
            reason: null,
            severity: null,
            status: 'True',
            type: 'Ready',
          },
        ],
      },
      version: '1.25.14',
    },
  },
  {
    __typename: 'ClusterEdge',
    node: {
      __typename: 'Cluster',
      apiDeprecations: [],
      currentVersion: '1.27.6',
      deletedAt: null,
      handle: 'workload-1',
      id: 'cccc',
      installed: true,
      name: 'workload-1',
      nodeMetrics: [
        {
          __typename: 'NodeMetric',
          usage: {
            __typename: 'NodeUsage',
            cpu: '119042082n',
            memory: '1443792Ki',
          },
        },
        {
          __typename: 'NodeMetric',
          usage: {
            __typename: 'NodeUsage',
            cpu: '157129708n',
            memory: '1660724Ki',
          },
        },
        {
          __typename: 'NodeMetric',
          usage: {
            __typename: 'NodeUsage',
            cpu: '75695848n',
            memory: '1264740Ki',
          },
        },
      ],
      nodes: [
        {
          __typename: 'Node',
          status: {
            __typename: 'NodeStatus',
            capacity: {
              cpu: '2',
              'ephemeral-storage': '47227284Ki',
              'hugepages-1Gi': '0',
              'hugepages-2Mi': '0',
              memory: '8145528Ki',
              pods: '110',
            },
          },
        },
        {
          __typename: 'Node',
          status: {
            __typename: 'NodeStatus',
            capacity: {
              cpu: '2',
              'ephemeral-storage': '47227284Ki',
              'hugepages-1Gi': '0',
              'hugepages-2Mi': '0',
              memory: '8145536Ki',
              pods: '110',
            },
          },
        },
        {
          __typename: 'Node',
          status: {
            __typename: 'NodeStatus',
            capacity: {
              cpu: '2',
              'ephemeral-storage': '47227284Ki',
              'hugepages-1Gi': '0',
              'hugepages-2Mi': '0',
              memory: '8145528Ki',
              pods: '110',
            },
          },
        },
      ],
      pingedAt: '3000-11-09T17:11:33.015081Z',
      protect: true,
      provider: {
        __typename: 'ClusterProvider',
        cloud: 'gcp',
        id: 'dddd',
        name: 'gcp',
        namespace: 'bootstrap',
        supportedVersions: ['1.28.1'],
      },
      self: false,
      service: {
        __typename: 'ServiceDeployment',
        id: 'eeee',
        repository: {
          __typename: 'GitRepository',
          url: 'https://github.com/pluralsh/scaffolds.git',
        },
      },
      status: {
        __typename: 'ClusterStatus',
        conditions: [
          {
            __typename: 'ClusterCondition',
            lastTransitionTime: '2023-11-03T18:49:05Z',
            message: null,
            reason: null,
            severity: null,
            status: 'True',
            type: 'Ready',
          },
        ],
      },
      version: '1.27.6',
    },
  },
  {
    __typename: 'ClusterEdge',
    node: {
      __typename: 'Cluster',
      apiDeprecations: [
        {
          __typename: 'ApiDeprecation',
          availableIn: null,
          blocking: false,
          component: {
            __typename: 'ServiceComponent',
            group: 'policy',
            kind: 'PodSecurityPolicy',
            name: 'test-psp',
            namespace: null,
            service: {
              __typename: 'ServiceDeployment',
              git: {
                __typename: 'GitRef',
                folder: 'test-apps/psps',
                ref: 'cd-scaffolding',
              },
              repository: {
                __typename: 'GitRepository',
                httpsPath: 'https://github.com/pluralsh/console',
                urlFormat: '{url}/tree/{ref}/{folder}',
              },
            },
            version: 'v1beta1',
          },
          deprecatedIn: 'v1.21.0',
          removedIn: 'v1.25.0',
          replacement: null,
        },
        {
          __typename: 'ApiDeprecation',
          availableIn: null,
          blocking: false,
          component: {
            __typename: 'ServiceComponent',
            group: 'batch',
            kind: 'CronJob',
            name: 'legacy-cron',
            namespace: 'cron-jobs',
            service: {
              __typename: 'ServiceDeployment',
              git: {
                __typename: 'GitRef',
                folder: 'test-apps/crons',
                ref: 'cd-scaffolding',
              },
              repository: {
                __typename: 'GitRepository',
                httpsPath: 'https://github.com/pluralsh/console',
                urlFormat: '{url}/tree/{ref}/{folder}',
              },
            },
            version: 'v1beta1',
          },
          deprecatedIn: 'v1.21.0',
          removedIn: 'v1.25.0',
          replacement: 'batch/v1',
        },
      ],
      currentVersion: '1.23.4',
      deletedAt: null,
      handle: 'kind-2',
      id: 'ffff',
      installed: true,
      name: 'kind-2',
      nodeMetrics: [],
      nodes: [],
      pingedAt: '3000-11-08T20:00:33.035838Z',
      protect: false,
      provider: null,
      self: false,
      service: null,
      status: null,
      version: null,
    },
  },
  {
    __typename: 'ClusterEdge',
    node: {
      __typename: 'Cluster',
      apiDeprecations: [],
      currentVersion: '1.25.14',
      deletedAt: null,
      handle: 'cd-demo',
      id: 'gggg',
      installed: true,
      name: 'main-cluster',
      nodeMetrics: [
        {
          __typename: 'NodeMetric',
          usage: {
            __typename: 'NodeUsage',
            cpu: '4000000000n',
            memory: '10000000Ki',
          },
        },
      ],
      nodes: [
        {
          __typename: 'Node',
          status: {
            __typename: 'NodeStatus',
            capacity: {
              cpu: '2',
              'ephemeral-storage': '47227284Ki',
              'hugepages-1Gi': '0',
              'hugepages-2Mi': '0',
              memory: '8145588Ki',
              pods: '110',
            },
          },
        },
        {
          __typename: 'Node',
          status: {
            __typename: 'NodeStatus',
            capacity: {
              cpu: '2',
              'ephemeral-storage': '47227284Ki',
              'hugepages-1Gi': '0',
              'hugepages-2Mi': '0',
              memory: '8145588Ki',
              pods: '110',
            },
          },
        },
        {
          __typename: 'Node',
          status: {
            __typename: 'NodeStatus',
            capacity: {
              cpu: '2',
              'ephemeral-storage': '47227284Ki',
              'hugepages-1Gi': '0',
              'hugepages-2Mi': '0',
              memory: '8145588Ki',
              pods: '110',
            },
          },
        },
      ],
      pingedAt: '3000-11-09T17:11:51.438277Z',
      protect: true,
      provider: {
        __typename: 'ClusterProvider',
        cloud: 'azure',
        id: 'hhhh',
        name: 'azure',
        namespace: 'bootstrap',
        supportedVersions: ['1.28.1'],
      },
      self: true,
      service: null,
      status: {
        __typename: 'ClusterStatus',
        conditions: [
          {
            __typename: 'ClusterCondition',
            lastTransitionTime: '2023-11-03T18:49:25Z',
            message: null,
            reason: null,
            severity: null,
            status: 'True',
            type: 'Ready',
          },
        ],
      },
      version: '1.25.14',
    },
  },
] as any[]
