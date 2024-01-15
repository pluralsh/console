import { useNavigate } from 'react-router-dom'
import {
  CD_ABS_PATH,
  SERVICES_REL_PATH,
  getServiceDetailsPath,
} from 'routes/cdRoutesConsts'
import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import DiffViewer from 'react-diff-viewer'
import { useTheme } from 'styled-components'

import { useServiceContext } from './ServiceDetails'

export default function ServiceDesiredState() {
  const navigate = useNavigate()
  const theme = useTheme()
  const { service } = useServiceContext()

  if (!service) {
    navigate(`${CD_ABS_PATH}/${SERVICES_REL_PATH}`)

    return null
  }
  if (!service.dryRun) {
    navigate(
      getServiceDetailsPath({
        serviceId: service.id,
        clusterId: service.cluster?.id,
      })
    )

    return null
  }

  return (
    <ScrollablePage
      heading="Desired state"
      scrollable={false}
    >
      {/* TODO */}
      <DiffViewer
        oldValue="apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
spec:
  selector:
    matchLabels:
      app: nginx
  replicas: 2
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:1.14.2
        ports:
        - containerPort: 80"
        newValue="apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
spec:
  selector:
    matchLabels:
      app: test
  replicas: 5
  template:
    metadata:
      labels:
        app: test
    spec:
      containers:
      - name: test
        image: test:1.14.8
        ports:
        - containerPort: 80"
        useDarkTheme={theme.mode === 'dark'}
        styles={{
          variables: {
            dark: {
              diffViewerBackground: theme.colors['fill-one'],
              highlightBackground: theme.colors['fill-one-selected'],
              gutterBackground: theme.colors['fill-two'],
              codeFoldGutterBackground: theme.colors['fill-one-selected'],
              codeFoldBackground: theme.colors['fill-one-selected'],
              codeFoldContentColor: theme.colors.text,
            },
          },
        }}
      />
    </ScrollablePage>
  )
}
