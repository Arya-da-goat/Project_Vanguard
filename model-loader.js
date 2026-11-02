import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js";

const loader = new GLTFLoader();
const cache = new Map();
const pending = new Map();

export function loadModel(url) {
  if (cache.has(url)) return Promise.resolve(cache.get(url));
  if (pending.has(url)) return pending.get(url);
  const p = new Promise((resolve, reject) => {
    loader.load(url, (gltf) => {
      const scene = gltf.scene || (gltf.scenes && gltf.scenes[0]);
      cache.set(url, scene);
      pending.delete(url);
      resolve(scene);
    }, undefined, (err) => {
      pending.delete(url);
      reject(err);
    });
  });
  pending.set(url, p);
  return p;
}

// manifest: { key: url }
export async function preloadModels(manifest) {
  const entries = Object.entries(manifest);
  await Promise.all(entries.map(async ([key, url]) => {
    try {
      const scene = await loadModel(url);
      cache.set(key, scene);
    } catch (e) {
      console.warn("Failed to load model", key, url, e);
    }
  }));
}

export function getModel(key) {
  const s = cache.get(key);
  if (!s || s instanceof Promise) return null;
  try {
    return s.clone(true);
  } catch (e) {
    return s.clone();
  }
}

export function isModelReady(key) {
  const s = cache.get(key);
  return !!s && !(s instanceof Promise);
}
