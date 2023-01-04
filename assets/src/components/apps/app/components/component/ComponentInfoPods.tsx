import { H2 } from 'honorable'

import { PodList } from '../kubernetes/Pod'

export default function ComponentInfoPods({
  pods, namespace, refetch,
}) {
  return (
    <>
      <H2 marginBottom="medium">Pods</H2>
      <PodList
        pods={pods}
        refetch={refetch}
        namespace={namespace}
      />
    </>
  )
}
