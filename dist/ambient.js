/* A quiet CSS backdrop, with a persistent motion preference. */
(() => {
  const button=document.querySelector('#motionToggle');
  const preference=matchMedia('(prefers-reduced-motion: reduce)');
  let enabled=true;
  try{enabled=localStorage.getItem('paperplane-motion')!=='off';}catch{}
  function update(){
    const running=enabled&&!preference.matches;
    document.documentElement.dataset.motion=running?'on':'off';
    button.setAttribute('aria-pressed',String(running));
    button.setAttribute('aria-label',running?'Pause background animations':'Enable background animations');
    button.title=preference.matches?'Animations follow your device’s reduced motion setting':running?'Pause the background animation':'Resume the background animation';
    button.querySelector('.motion-label').textContent=running?'Motion on':'Motion off';
    button.querySelector('.motion-icon').textContent=running?'Ⅱ':'▷';
    button.disabled=preference.matches;
  }
  button.addEventListener('click',()=>{enabled=!enabled;try{localStorage.setItem('paperplane-motion',enabled?'on':'off');}catch{}update();});
  preference.addEventListener('change',update);
  update();
})();
