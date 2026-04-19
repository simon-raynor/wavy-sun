import './style.css'
import tween from './tween';

type Vec2 = [number, number]



const canvas = document.createElement('canvas');

resizeCanvasToScreen(canvas);

document.body.append(canvas);


function resizeCanvasToScreen(canvas: HTMLCanvasElement) {
    // account for different screen resolutions
    canvas.height = window.innerHeight * window.devicePixelRatio;
    canvas.width = window.innerWidth * window.devicePixelRatio;
    canvas.style.height = window.innerHeight + 'px';
    canvas.style.width = window.innerWidth + 'px';
}

const ctx = canvas.getContext('2d')!;
// account for different screen resolutions
ctx.scale(window.devicePixelRatio, window.devicePixelRatio);



function polarToXY([cx, cy]: Vec2, radius: number, angle: number): Vec2 {
    const theta = Math.PI * (angle / 180);
    const sin = Math.sin(theta);
    const cos = Math.cos(theta);
    const x = cx + radius * cos;
    const y = cy + radius * sin;

    return [x, y];
}



// N.B. final number not used due to how we tween in/out
const BASE_RADII = [15, 13, 11, 9, 7, 0];
const SECONDS_PER_WIGGLE = 1;
const SECONDS_PER_CYCLE = SECONDS_PER_WIGGLE * 2;
const SECONDS_PER_SPIN = 5;



function getWiggleRadiiAtT(t: number) {
    return BASE_RADII.map(
        (radius, idx) => {
            if (!idx) {
                return tween(0, radius, t);
            } else if (idx === BASE_RADII.length - 1) {
                return tween(BASE_RADII[idx - 1], 0, t);
            } else return tween(BASE_RADII[idx - 1], radius, t);
        }
    );
}

function wigglyLine(from: Vec2, to: Vec2, radii: number[], reversed: boolean) {
    const [fx ,fy] = from;
    const [tx, ty] = to;
    const dx = tx - fx;
    const dy = ty - fy;

    const total = radii.reduce((m, c) => m + c, 0);

    const length = Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));
    let lineAngle = Math.asin(dy / length);
    if (dx < 0) lineAngle =  Math.PI - lineAngle;

    
    ctx.save();
    ctx.translate(fx, fy);
    ctx.rotate(lineAngle);

    let cumulativeX = 0;

    radii.forEach((r, i) => {
        const x = r * length / total;

        const isOdd = !!(i % 2) !== reversed;
        const startAngle = isOdd
            ? -5 * Math.PI / 4
            : -3 * Math.PI / 4;
        const endAngle = isOdd
            ? -7 * Math.PI / 4
            : -1 * Math.PI / 4;
        const radius = x / Math.SQRT2;
        const y = isOdd ? -radius / Math.SQRT2 : radius / Math.SQRT2;

        ctx.arc(cumulativeX + (x / 2), y, radius, startAngle, endAngle, isOdd);

        cumulativeX += x;
    });

    ctx.restore();
}

function drawLayer(t: number, centre: Vec2, radius: number, flareCount: number, flareLength: number = 1, spin: number = 1) {
    const wiggleT = (t % SECONDS_PER_WIGGLE) / SECONDS_PER_WIGGLE;
    const wiggleFlip = (t % SECONDS_PER_CYCLE) >= SECONDS_PER_WIGGLE
        != spin > 0;

    ctx.beginPath();
    
    const degreesPer = 360 / flareCount;
    const radiusPoints: Vec2[] = [];
    const spikePoints: Vec2[] = [];
    const spinOffset = spin * degreesPer * (t % SECONDS_PER_SPIN) / SECONDS_PER_SPIN;

    for (let angle = 0; angle < 360; angle += degreesPer) {
        radiusPoints.push(polarToXY(centre, radius, angle + spinOffset));
        spikePoints.push(polarToXY(
            centre,
            radius + (radius * flareLength),
            angle + (degreesPer / 2) + spinOffset
        ));
    }

    const wiggleRadii = getWiggleRadiiAtT(wiggleT);
    const wiggleRadRev = wiggleRadii.slice().reverse();

    radiusPoints.forEach((point, idx) => {
        const spike = spikePoints[idx];
        const nextpoint = radiusPoints[(idx + 1) % flareCount];
        
        wigglyLine(point, spike, wiggleRadii, false !== wiggleFlip);
        wigglyLine(spike, nextpoint, wiggleRadRev, !!(BASE_RADII.length % 2) !== wiggleFlip);
    });


}

function drawSun(t: number, centre: Vec2, radius: number, layers: number = 2) {
    const baseFlareLength = 1.125;
    const layerRadius = radius / (1 + baseFlareLength);

    const sizeStep = 0.9;
    const flareStep = 0.95;

    for (let i = 0; i < layers; i++) {
        drawLayer(
            t,
            centre,
            layerRadius * Math.pow(sizeStep, i),
            15 - i,
            baseFlareLength / Math.pow(flareStep, i),
            (i % 2) ? 1 + i : -1 - i
        );
        paintCurrentPath();
    }

    ctx.beginPath();
    const outerCoreRadius = layerRadius * Math.pow(sizeStep, layers);
    ctx.moveTo(centre[0] + outerCoreRadius, centre[1]);
    ctx.arc(centre[0], centre[1], outerCoreRadius, 0, 2 * Math.PI, false);
    paintCurrentPath();
}


function paintCurrentPath() {
    const LINE_WIDTH = 4 / window.devicePixelRatio;
    const FILL = 'gold';
    const STROKE = 'lightgoldenrodyellow';
    const SHADOW = 'goldenrod';

    ctx.lineJoin = 'round';

    ctx.strokeStyle = SHADOW;
    ctx.lineWidth = LINE_WIDTH * 5;
    ctx.stroke();

    ctx.strokeStyle = FILL;
    ctx.lineWidth = LINE_WIDTH * 3;
    ctx.stroke();

    ctx.fillStyle = FILL;
    ctx.fill();

    ctx.strokeStyle = STROKE;
    ctx.lineWidth = LINE_WIDTH;
    ctx.stroke();
}


function loop(t: number) {
    // wipe for next frame
    ctx.clearRect(0,0,ctx.canvas.width / window.devicePixelRatio,ctx.canvas.height / window.devicePixelRatio);
    
    try {
        drawSun(
            t / 1000,
            [
                (window.innerWidth / 10) * Math.sin(t / 5000) + window.innerWidth / 2,
                (window.innerWidth / 15) * Math.cos(t / 5000) + window.innerHeight / 3
            ],
            Math.min(window.innerWidth / 2, 2 * window.innerHeight / 3),
            3
        );

        // example line
        ctx.beginPath();
        wigglyLine(
            [36, window.innerHeight - 40],
            [Math.min(window.innerWidth - 36, 336), window.innerHeight - 40],
            getWiggleRadiiAtT(((t / 1000) % SECONDS_PER_WIGGLE) / SECONDS_PER_WIGGLE),
            ((t / 1000) % SECONDS_PER_CYCLE) >= SECONDS_PER_WIGGLE
        );
        ctx.lineCap = 'round';
        ctx.lineWidth = 8 / window.devicePixelRatio;
        ctx.strokeStyle = '#111';
        ctx.stroke();

    } catch(ex) {
        console.error(ex);
    }

    requestAnimationFrame(loop);
}

requestAnimationFrame(loop);