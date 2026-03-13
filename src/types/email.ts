export interface EmailDTO {
  id: string
  accountId: string
  subject: string
  sender: string
  recipient: string
  preview: string
  isRead: boolean
  timestamp: Date
}

export interface AccountDTO {
  id: string
  email: string
  lastSyncAt: Date | null
  syncStatus: SyncStatus
  emailCount: number
}

export enum SyncStatus {
  IDLE = 'IDLE',
  SYNCING = 'SYNCING',
  ERROR = 'ERROR'
}

// Response types (from server)
export interface EmailResponse extends Omit<EmailDTO, 'timestamp'> {
  timestamp: string
}

export interface AccountResponse extends Omit<AccountDTO, 'lastSyncAt'> {
  lastSyncAt: string | null
}

export interface ConnectAccountResponse {
  success: boolean
  authUrl: string
  state: string
}

export interface CallbackResponse {
  success: boolean
  account: AccountResponse
}

export interface ListAccountsResponse {
  success: boolean
  accounts: AccountResponse[]
}

export interface DisconnectAccountResponse {
  success: boolean
  emailsDeleted: number
}

export interface ListEmailsResponse {
  success: boolean
  emails: EmailResponse[]
  total: number
  hasMore: boolean
}

export interface MarkReadResponse {
  success: boolean
  email: EmailResponse
}

export interface SearchEmailsResponse {
  success: boolean
  emails: EmailResponse[]
}

export interface SyncResult {
  accountId: string
  accountEmail: string
  newEmails: number
  errors: string[]
  success: boolean
}

export interface TriggerSyncResponse {
  success: boolean
  results: SyncResult[]
}

// Store state
export interface EmailState {
  emails: EmailDTO[]
  accounts: AccountDTO[]
  selectedAccountId: string | null
  showRead: boolean | null  // null = all, true = read, false = unread
  searchQuery: string
  loading: boolean
  syncing: boolean
  error: string | null
  total: number
  hasMore: boolean
}
