import './style.css'
import createSunflare from './sunflare';



const R = 40;


const stage = document.getElementById('stage');

const FLARE_ID = 'sunflare'


const [symbols, update] = createSunflare(FLARE_ID, R)

stage.querySelector('defs')!.append(symbols);


const sun = document.createElementNS('http://www.w3.org/2000/svg', 'use');

sun.setAttribute('href', `#${FLARE_ID}`);

stage.append(sun);


let t = 0;
function loop() {
    update(t);

    t++;
    requestAnimationFrame(loop);
}

loop();