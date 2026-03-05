interface MailAccount {
  email: string
  password: string
  imap: string
}

interface EmailMessage {
  id: number
  from: string
  subject: string
  date: Date
  text: string
  account: string
}

export type {
  MailAccount, EmailMessage
}