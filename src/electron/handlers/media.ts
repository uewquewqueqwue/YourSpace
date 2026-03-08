import { ipcMain } from 'electron'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'
import os from 'os'

const execAsync = promisify(exec)

let currentTrack = { 
  title: '', 
  artist: '', 
  isPlaying: false,
  bitrate: '320kbps',
  duration: 0,
  position: 0,
  progress: 0
}

async function getSpotifyInfo() {
  const tempFile = path.join(os.tmpdir(), `spotify_${Date.now()}.ps1`)
  
  const psScript = `
Add-Type -AssemblyName System.Runtime.WindowsRuntime

$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { 
    $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and 
    $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation\`1' 
})[0]

function Await($WinRtTask, $ResultType) {
    $asTask = $asTaskGeneric.MakeGenericMethod($ResultType)
    $netTask = $asTask.Invoke($null, @($WinRtTask))
    $netTask.Wait(-1) | Out-Null
    return $netTask.Result
}

try {
    [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager,Windows.Media.Control,ContentType=WindowsRuntime] | Out-Null
    
    $Manager = Await ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
    
    if ($null -eq $Manager) {
      Write-Output "null"
      return
    }
    
    $Session = $Manager.GetCurrentSession()
    
    if ($null -eq $Session) {
      Write-Output "null"
      return
    }
    
    $MediaProperties = Await ($Session.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
    $PlaybackInfo = $Session.GetPlaybackInfo()
    $Timeline = $Session.GetTimelineProperties()
    
    $Status = if ($PlaybackInfo -and $PlaybackInfo.PlaybackStatus) { 
      $PlaybackInfo.PlaybackStatus.ToString() 
    } else { 
      "Stopped" 
    }
    
    $Position = 0
    $Duration = 0
    
    if ($Timeline) {
        if ($Timeline.Position) {
            $Position = [math]::Round($Timeline.Position.TotalSeconds)
        }
        if ($Timeline.EndTime) {
            $Duration = [math]::Round($Timeline.EndTime.TotalSeconds)
        }
    }
    
    $result = @{
      title = if ($MediaProperties.Title) { $MediaProperties.Title } else { "" }
      artist = if ($MediaProperties.Artist) { $MediaProperties.Artist } else { "" }
      playbackStatus = $Status
      duration = $Duration
      position = $Position
    }
    
    Write-Output ($result | ConvertTo-Json -Compress)
} catch {
    Write-Output "null"
}
  `

  try {
    fs.writeFileSync(tempFile, psScript, 'utf8')
    
    const { stdout } = await execAsync(
      `powershell -ExecutionPolicy Bypass -File "${tempFile}"`
    )
    
    fs.unlinkSync(tempFile)
    
    const trimmed = stdout.trim()
    
    if (!trimmed || trimmed === 'null') {
      return null
    }

    return JSON.parse(trimmed)
  } catch (error) {
    console.error('[Spotify] Error:', error)
    return null
  }
}

export function setupMediaHandlers() {
  setInterval(async () => {
    try {
      const info = await getSpotifyInfo()
      
      if (info && info.title) {
        currentTrack = {
          title: info.title,
          artist: info.artist || '',
          isPlaying: info.playbackStatus === 'Playing',
          bitrate: '320kbps',
          duration: info.duration || 0,
          position: info.position || 0,
          progress: info.duration ? (info.position || 0) / info.duration : 0
        }
      } else {
        currentTrack = { 
          title: '', 
          artist: '', 
          isPlaying: false,
          bitrate: '320kbps',
          duration: 0,
          position: 0,
          progress: 0
        }
      }
    } catch (error) {
      console.error('[Spotify] Error:', error)
    }
  }, 10000)

  ipcMain.handle('media:get-track', async () => {
    return currentTrack
  })

  ipcMain.handle('media:subscribe', (event) => {
    event.sender.send('media:updated', currentTrack)
    
    const interval = setInterval(() => {
      event.sender.send('media:updated', currentTrack)
    }, 10000)

    event.sender.once('destroyed', () => clearInterval(interval))
  })

  ipcMain.handle('media:unsubscribe', () => {
    return true
  })
}