import type { ProcessInfo } from '@/types/apps'

export const BLACKLIST = [
  'svchost', 'system', 'dwm', 'conhost', 'fontdrvhost',
  'csrss', 'wininit', 'services', 'lsass', 'smss',
  'runtimebroker', 'backgroundtaskhost', 'sihost',
  'taskhostw', 'shellexperiencehost', 'searchapp',
  'securityhealth', 'unsecapp', 'wmiprvse', 'spoolsv',
  'ctfmon', 'applicationframehost', 'vmms', 'amd',
  'nvcontainer', 'nissrv', 'dllhost', 'wbem', 'sql',
  'explorer', 'widgets', 'crossdevice', 'edgewebview',
  'armoury', 'asus', 'vgtray', 'vanguard', 'yourphone',
  'phoneexperiencehost', 'wakatime', 'esbuild', 'electron',
  'Your Space', 'yourspace', 'YourSpace', 'Memory Compression',
  'Registry', 'Idle', 'System', 'winlogon', 'atieclxx',
  'AggregatorHost', 'MidiSrv', 'AUEPDU', 'httpd', 'pg_ctl',
  'postgres', 'redis-server', 'NisSrv', 'winws', 'service_update',
  'AcPowerNotification', 'asus_framework', 'CPUMetricsServer',
  'AMDRSServ', 'amdow', 'GameBarPresenceWriter', 'smartscreen',
  'atiesrxx', 'atkexComSvc', 'audiodg', 'AUEPMaster',
  'ftnlsv', 'ftscanmgrhv', 'MpDefenderCoreService', 'MsMpEng',
  'OfficeClickToRun', 'PlanetVPNService', 'powershell',
  'ROGLiveService', 'SearchIndexer', 'steamservice', 'steamwebhelper',
  'Taskmgr', 'vmcompute', 'vmware-usbarbitrator64', 'vmwsprrdpwks',
  'node', 'wslservice', 'MoUsoCoreWorker', 'LeagueClientUx',
  'LeagueClientUxRender', 'LeagueCrashHandler64', 'RiotClientCrashHandler'
]

export function isSystemProcess(process: ProcessInfo): boolean {
  const nameLower = process.displayName.toLowerCase()
  const pathLower = process.path.toLowerCase()

  if (BLACKLIST.some(b => nameLower.includes(b.toLowerCase()) || pathLower.includes(b.toLowerCase()))) return true
  if (pathLower.includes('\\windows\\')) return true
  if (pathLower.includes('\\windowsapps\\')) return true
  if (pathLower.includes('\\edgewebview\\')) return true
  if (pathLower.includes('\\node_modules\\')) return true
  if (pathLower.includes('\\temp\\')) return true
  if (process.displayName.length < 2) return true

  return false
}