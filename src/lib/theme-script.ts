/** Runs before paint so the saved theme never flashes. */
export const themeBootScript = `try{var t=localStorage.getItem('hma-theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)}catch(e){}`;
