import { ReactElement, useMemo } from 'react'
import { useTheme } from 'styled-components'
import { ProviderObjectType } from '../CloudObjectsCard.tsx'
import CloudObject from './CloudObject.tsx'

interface AwsVpc {
  vpc_id: string
  vpc_name: string
}

interface AwsAccount {
  account_id: string
  title: string
}

interface AwsEks {
  name: string
}

interface AwsVpcSubnet {
  subnet_id: string
}

function AwsObjects({
  type,
  content,
}: {
  type: ProviderObjectType
  content: string
}): ReactElement | null {
  const theme = useTheme()

  const objectList: Array<{
    type: string
    id: string
    icon?: ReactElement
    object: any
  }> = useMemo(() => {
    let decodedList: Array<any> = []
    try {
      decodedList = JSON.parse(content)
    } catch (_) {
      return []
    }

    switch (type) {
      case ProviderObjectType.VPC:
        return decodedList.map((item: AwsVpc) => ({
          type: 'VPC',
          id: item.vpc_name ?? item.vpc_id,
          object: item,
        }))
      case ProviderObjectType.VPCSubnet:
        return decodedList.map((item: AwsVpcSubnet) => ({
          type: 'VPC Subnet',
          id: item.subnet_id,
          object: item,
        }))
      case ProviderObjectType.Account:
        return decodedList.map((item: AwsAccount) => ({
          type: 'Account',
          id: item.title ?? item.account_id,
          object: item,
        }))
      case ProviderObjectType.EKS:
        return decodedList.map((item: AwsEks) => ({
          type: 'EKS',
          id: item.name,
          object: item,
        }))
      default:
        return []
    }
  }, [content, type])

  return objectList?.length === 0 ? null : (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.small,
      }}
    >
      {objectList.map(({ type, id, icon, object }) => (
        <CloudObject
          type={type}
          id={id}
          json={JSON.stringify(object, null, 1)}
          icon={icon}
        />
      ))}
    </div>
  )
}

export { AwsObjects }
