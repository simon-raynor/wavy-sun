import tween from "./tween";


const RATIOS = [15, 12, 10, 8, 6, 4, 3];
const TOTALRATIO = RATIOS.reduce((m, c) => m + c, 0);


const HEIGHTMULT = 3;


function arcs(t: number, size: number = 25, mult: number) {
    // we need to split the input t (0 to 1) into
    // two sets of 0 to 1 so we can flip, which
    // alternates the initial bump "up" and "down"
    const offset = (t * 2) % 1;
    const flip = t >= 0.5 ? 1 : 0;

    const length = mult * size;
    const scale = length / TOTALRATIO;

    // heightmult is doubled because we need two lines
    // from this set of points
    const heightmult = mult * 2;

    const bumps = [];

    RATIOS.forEach(
        (ratio, idx, arr) => {
            const inverse = (idx % 2) !== flip;
            const isLast = idx === arr.length - 1;

            let size = isLast ? ratio : tween(ratio, arr[idx + 1], offset);
            let radius = scale * size;
            let x = radius * Math.SQRT2;
            let y = x / heightmult;

            // first
            if (!idx) {
                radius = offset * radius;
                x = radius * Math.SQRT2;
                y = x / heightmult;

            // last
            } else if (isLast) {
                radius = radius * (1 - offset);
                x = radius * Math.SQRT2;
                y = x / heightmult;
            }

            bumps.push({
                r: radius,
                i: inverse ? 1 : 0,
                x, y
            })
        }
    );

    return bumps;
}


function createFlare(id: string, size: number, heightmult: number = HEIGHTMULT): [SVGSymbolElement, (t: number) => void] {
    const symbol = document.createElementNS('http://www.w3.org/2000/svg', 'symbol');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');

    symbol.setAttribute('id', id);
    
    function update(t: number) {
        let pathStr = `M0 ${size / 2}`;

        const bumps = arcs(t, size, heightmult);

        pathStr += bumps
            .map(({ r, i, x, y }) => `a${r} ${r} 0 0 ${i} ${x} ${y}`)
            .join('');
        
        pathStr += bumps.slice().reverse()
            .map(({ r, i, x, y }) => `a${r} ${r} 0 0 ${i ? 0 : 1} ${-x} ${y}`)
            .join('');

        path.setAttribute('d', pathStr);
    }

    symbol.append(path);

    return [symbol, update];
}


const BASEMULT = 1;
const MULTSTEP = 1;


const WIGGLE_FREQ = 60;
const SPIN_FREQ = 0.1;


export default function createSun(id: string, size: number, layers: number = 3): [DocumentFragment, (t: number) => void] {
    const symbols = document.createDocumentFragment();
    const symbol = document.createElementNS('http://www.w3.org/2000/svg', 'symbol');
    
    symbol.setAttribute('id', id);

    const updaters: Array<(t: number) => void> = [];

    const cx = 300;
    const cy = 300;

    for (let layerNo = layers; layerNo > 0; layerNo--) {
        const layerSize = size;

        const layerId = `${id}_layer_${layerNo}`;
        const flareId = `${id}_flare_${layerNo}`;

        const flareSize = layerSize * 0.55;

        const [flareSymbol, updateFlare] = createFlare(flareId, flareSize, BASEMULT + (MULTSTEP * layerNo));
        updaters.push(t => updateFlare(((t + (layerNo * (WIGGLE_FREQ / layers))) % WIGGLE_FREQ) / WIGGLE_FREQ));
        symbols.append(flareSymbol);

        const layer = document.createElementNS('http://www.w3.org/2000/svg', 'symbol');
        layer.setAttribute('id', layerId);
        
        // append <use>s for the flare around a circle centered
        // at `cx`, `cy` with radius `size`
        const count = 11 + layerNo;
        const degreesPer = 360 / count;

        for (let j = 0; j < 360; j += degreesPer) {
            const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
            use.setAttribute('href', `#${flareId}`);

            const theta = Math.PI * (j / 180);
            const sin = Math.sin(theta);
            const cos = Math.cos(theta);
            const x = cx + layerSize * cos;
            const y = cy + layerSize * sin;

            const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            g.setAttribute('transform', `translate(${x} ${y - flareSize})`);

            const g2 = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            g2.setAttribute('transform', `translate(0 ${flareSize}) rotate(${j}) translate(0 ${-flareSize})`);

            g.append(g2);
            g2.append(use);

            layer.append(g);
        }
        
        symbols.append(layer);


        const fillLayer = document.createElementNS('http://www.w3.org/2000/svg', 'use');
        fillLayer.setAttribute('href', `#${layerId}`);
        fillLayer.setAttribute('class', 'fill');

        const strokeLayer = document.createElementNS('http://www.w3.org/2000/svg', 'use');
        strokeLayer.setAttribute('href', `#${layerId}`);
        strokeLayer.setAttribute('class', 'stroke');

        // spin layers
        updaters.push(t => {
            const transform = `translate(${cx} ${cy}) rotate(${t * ((1 + layerNo) / (layers + 1)) * (layerNo % 2 ? -1 : 1) * SPIN_FREQ}) translate(${-cx} ${-cy})`;
            fillLayer.setAttribute('transform', transform);
            strokeLayer.setAttribute('transform', transform);
        });


        // append to the main symbol
        symbol.append(fillLayer, strokeLayer);
    }

    const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c.setAttribute('cx', `${cx}`);
    c.setAttribute('cy', `${cy}`);
    c.setAttribute('r', `${size * 1.05}`);
    c.setAttribute('class', 'fill');

    const c2 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c2.setAttribute('cx', `${cx}`);
    c2.setAttribute('cy', `${cy}`);
    c2.setAttribute('r', `${size * 1.05}`);
    c2.setAttribute('class', 'stroke');


    
    symbol.append(c, c2);


    symbols.append(symbol);

    function update(t: number) {
        updaters.forEach(u => u(t));

        //symbol.setAttribute('transform', `rotate(${t})`);
    }

    return [symbols, update]
}