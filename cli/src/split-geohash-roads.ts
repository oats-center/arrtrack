import log from './log.js';
import { readdir, readFile, writeFile } from 'fs/promises';
import type { FeatureCollection, Feature, LineString, MultiLineString, Position} from 'geojson';
import { mkdirp } from 'mkdirp';
import pmap from 'p-map';
import shape2geohash from 'shape2geohash';
import geohash from 'latlon-geohash';
import { bbox } from '@turf/turf'

const { info, trace } = log.get('split-geohash-roads');

const GEOHASH_LENGTH = 5;

export async function splitGeohashRoads({ dir, file, output }: { dir?: string, file?: string, output?: string}): Promise<void> {
  trace('Starting splitGeohashRoads...');
  if (!dir && !file) throw new Error('ERROR: you must pass either -d <directory> or -f <file>');
  
  let files: string[] = [];
  if (file) files = [ file ];
  if (dir) {
    files = (await readdir(dir)).filter(f => f.match(/(\.geojson.json|\.geojson|\.json)$/)).map(f => `${dir}/${f}`)
  }
  trace('Have files: ', files);

  // Sort all the features into geohash buckets
  const geohash_buckets: { [geohash4: string]: Feature[] } = {};
  for (const [fileindex, file] of files.entries()) {
    info('Reading file: ', file);
    const geojson = JSON.parse((await readFile(file)).toString()) as FeatureCollection;

    for (const feature of geojson.features) {
      // The shape2geohash library can handle any kind of geojson shape, but I am expecting
      // only linestrings so I'll throw if something else shows up just in case
      if (feature.geometry.type !== 'LineString' && feature.geometry.type !== 'MultiLineString') {
        throw new Error(`Apparently some things are not LineStrings or MultiLineStrings.  This one is ${feature.geometry.type}.  Handle it.`);
      }

      const geohash4s = await shape2geohash(feature, { precision: GEOHASH_LENGTH, allowDuplicates: false });
      for (const g4 of geohash4s) {
        const fclone = { ...feature }; // make a shallow clone so we can save this same feature separately for every geohash bucket it is in with that geohash in the properties
        fclone.properties = { ...feature.properties, geohash: g4 }; // add the geohash to the properties
        
        if (!geohash_buckets[g4]) geohash_buckets[g4] = [];
        geohash_buckets[g4]!.push(fclone);
      }
    }

    trace('-----------------------------------------------------');
    trace('   SUMMARY: ', file, '(',fileindex,'of',files.length,')');
    for (const [g4, feats] of Object.entries(geohash_buckets)) {
      trace(g4, ':', feats.length, 'features');
    }
    trace('-----------------------------------------------------');

  }

  info('==========================================================');
  info(' FINAL SUMMARY OF ALL GEOHASHES: ');
  info('Total geohashes of length', GEOHASH_LENGTH,': ',Object.keys(geohash_buckets).length);
  for(const [g, features] of Object.entries(geohash_buckets)) {
    info('    ',g,':',features.length,' features');
  }
  info('==========================================================');

  if (!output) {
    info('No output directory given (-o), not writing files');
    return;
  }
  await mkdirp(output);
 
  info('Writing files to',output);
  await pmap(
    Object.entries(geohash_buckets), 
    ([geohash, json]) => writeFile(`${output}/${geohash}.json`, JSON.stringify({
      type: 'FeatureCollection',
      features: json
    })), 
    { concurrency: 100 }
  );

  info('Done!  CTRL-C to quit');
  return;
}
/*
function shape2geohash(shp: Feature<LineString> | Feature<MultiLineString>): string[] {
  let lines: Position[][] = [];
  if (shp.geometry.type === 'MultiLineString') {
    lines = [ ...lines, ...shp.geometry.coordinates ];
  } else {
    lines.push(shp.geometry.coordinates);
  }
  for (const line of lines) {
    let prev: Position | null = null;
    for (const point of line) {
      if (prev) {
        const segment = [ prev, point ];

      }
      prev = line;
    }
  }
}*/
