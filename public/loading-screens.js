// Runs before Phaser so each visit has character artwork throughout the real boot load.
(() => {
  const screens = [
    { id: 'roster', name: 'THE FIGHTERS', path: 'assets/ui/loading-screen.png', lore: 'Lacy, Mr Wake and Soul Summoner' },
    { id: 'soul-summoner', name: 'SOUL SUMMONER', lore: 'His fallen friends at the Sky Sanctum gates' },
    { id: 'mr-wake', name: 'MR WAKE', lore: 'The black water beneath Gravemoon Bridge' },
    { id: 'hero-knight', name: 'LACY', lore: 'The last oath of a fallen kingdom' },
    { id: 'nu', name: 'NU', lore: 'An empty stage waiting for the frontman' },
    { id: 'aero', name: 'AERO', lore: 'A living world inside a forgotten desktop' },
    { id: 'what-once-was', name: 'WHAT ONCE WAS', lore: 'Searching the Backrooms of Level 0' },
    { id: 'last-seen', name: 'ROSEMARY', lore: 'A missing poster and the shape that came back' },
  ];
  let previous = -1;
  try { const saved=localStorage.getItem('rebirth.loading.previous');if(saved!==null)previous=Number(saved); } catch {}
  const valid=Number.isInteger(previous)&&previous>=0&&previous<screens.length;
  const index=valid?(previous+1+Math.floor(Math.random()*(screens.length-1)))%screens.length:Math.floor(Math.random()*screens.length);
  const selected=screens[index],root=document.getElementById('loading'),image=root?.querySelector('img');
  if(!image)return;
  try {localStorage.setItem('rebirth.loading.previous',String(index));} catch {}
  root.dataset.screen=selected.id;root.setAttribute('aria-label','Loading Operation REBIRTH — '+selected.name);
  image.alt='Loading — '+selected.name+'. '+selected.lore;
  image.onerror=()=>{image.onerror=null;image.src=screens[0].path;image.alt='Loading — Lacy, Mr Wake and Soul Summoner';root.dataset.screen='roster';};
  image.src=selected.path||'assets/ui/loading/'+selected.id+'.png';
})();
