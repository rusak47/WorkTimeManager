const { contextBridge, ipcRenderer } = require('electron');

const API = {
  loadData: () => ipcRenderer.invoke('data:load'),
  saveData: (data) => ipcRenderer.invoke('data:save', data),
  loadCalendar: (year) => ipcRenderer.invoke('calendar:load', year),
  getAppVersion: () => ipcRenderer.invoke('app:version'),
};

contextBridge.exposeInMainWorld('api', API);
