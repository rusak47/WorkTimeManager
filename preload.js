// Preload script runs in an isolated context with access to both Node.js and browser APIs
// It's used to safely expose Node.js APIs to your web content

window.addEventListener('DOMContentLoaded', () => {
    // You can modify the DOM here or expose specific Node.js functionality to the renderer
    // For example:
    
    // Example of exposing a version variable
    const replaceText = (selector, text) => {
      const element = document.getElementById(selector)
      if (element) element.innerText = text
    }
  
    // You can access Node.js APIs here and expose specific functionality
    // to your web content via the contextBridge
    
    // Example: Display electron version in your web content
    for (const dependency of ['chrome', 'node', 'electron']) {
      replaceText(`${dependency}-version`, process.versions[dependency])
    }
  })