import { AWSIcon, AWSIconName } from '@pluralsh/design-system'
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

interface AwsObjectsProps {
  type: ProviderObjectType
  objects: Array<any>
}

function AwsObjects({ type, objects }: AwsObjectsProps): ReactElement | null {
  const theme = useTheme()

  const objectList: Array<{
    type: string
    id: string
    icon?: ReactElement
    object: any
  }> = useMemo(() => {
    switch (type) {
      case ProviderObjectType.VPC:
        return objects.map((item: AwsVpc) => ({
          type: 'VPC',
          id: item.vpc_name ?? item.vpc_id,
          icon: <AWSIcon name={AWSIconName.VPC} />,
          object: item,
        }))
      case ProviderObjectType.VPCSubnet:
        return objects.map((item: AwsVpcSubnet) => ({
          type: 'VPC Subnet',
          id: item.subnet_id,
          icon: <AWSIcon name={AWSIconName.VPC} />,
          object: item,
        }))
      case ProviderObjectType.Account:
        return objects.map((item: AwsAccount) => ({
          type: 'Account',
          id: item.title ?? item.account_id,
          icon: <AWSIcon name={AWSIconName.Account} />,
          object: item,
        }))
      case ProviderObjectType.EKS:
        return objects.map((item: AwsEks) => ({
          type: 'EKS',
          id: item.name,
          icon: <AWSIcon name={AWSIconName.EKS} />,
          object: item,
        }))
      default:
        return []
    }
  }, [objects, type])

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
