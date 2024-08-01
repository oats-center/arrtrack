// Sadly, this this only works in Node.  It fails when vite loads it into the browser
// because vite says it can't use Stream.Readable.
// import shape2geohash from 'shape2geohash';
import geohash from 'latlon-geohash';
import { buffer, bbox, point } from '@turf/turf';
import { MAXROADWIDTH_FEET, GEOHASH_LENGTH } from '@track-patch/constants';
import log from './log.js';
const { info } = log.get('geohash');
export function gps2PotentialGeohashes({ lat, lon }) {
    const [minx, miny, maxx, maxy] = bbox(buffer(point([lon, lat]), MAXROADWIDTH_FEET, { units: 'feet' }));
    const geohashes = {};
    const points = [
        { lat: miny, lon: minx },
        { lat: miny, lon: maxx },
        { lat: maxy, lon: minx },
        { lat: maxy, lon: maxx },
    ];
    for (const p of points) {
        geohashes[geohash.encode(p.lat, p.lon, GEOHASH_LENGTH)] = true;
    }
    //info('Returning geohashes',Object.keys(geohashes),'for point',lat,',',lon);
    //info('bbox = ',points);
    return Object.keys(geohashes);
}
//# sourceMappingURL=geohash.js.map