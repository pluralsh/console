import { type Dispatch } from 'react'

import Radio from '../../Radio'
import RadioGroup from '../../RadioGroup'

import Control from './Control'

const OPTIONS = [
  {
    value: '0',
    label: '0-5',
  },
  {
    value: '10',
    label: '10',
  },
  {
    value: '30',
    label: '30',
  },
  {
    value: '60',
    label: '60*',
  },
]

type UsersControlProps = {
  users: number
  setUsers: Dispatch<number>
}

export default function UsersControl({ users, setUsers }: UsersControlProps) {
  return (
    <Control
      header="How many users will access your clusters?"
      caption="Plural is free for up to 5 open-source users. Accounts requiring more than 5 users and accounts on the professional plan will add $49/user."
    >
      <RadioGroup
        defaultValue={`${users}`}
        onChange={(s: string) => setUsers(parseInt(s))}
        display="flex"
        gap="medium"
      >
        {OPTIONS.map(({ value, label }) => (
          <Radio
            value={value}
            small
          >
            {label}
          </Radio>
        ))}
      </RadioGroup>
    </Control>
  )
}
