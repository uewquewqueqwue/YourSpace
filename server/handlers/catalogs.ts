import { ipcMain } from 'electron'
import { appService } from '../services/AppService'
import { handleError } from '../utils/errors'

export function setupCatalogsHandlers() {
  ipcMain.handle('catalogs:getAll', async () => {
    try {
      return await appService.getAllCatalogs()
    } catch (error) {
      handleError(error, 'catalogs:getAll')
    }
  })

  ipcMain.handle('catalogs:create', async (event, data) => {
    try {
      return await appService.createCatalog(data)
    } catch (error) {
      handleError(error, 'catalogs:create')
    }
  })
}