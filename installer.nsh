!macro customInit
  ; Если это обновление
  IfFileExists "$INSTDIR\YourSpace.exe" 0 notInstalled
    ; Запускаем в тихом режиме
    SetSilent silent
    !define INTERACTIVE_MODE "disabled"
    Goto done
  notInstalled:
    ; Первая установка - обычный режим
    SetSilent normal
  done:
!macroend

!macro customInstall
  ; При обновлении не показываем окна
  ${If} ${Silent}
    SetAutoClose true
  ${EndIf}
!macroend