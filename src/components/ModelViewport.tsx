import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { ModelArtifact } from "../core/types";

export function ModelViewport({ model }: { model?: ModelArtifact }) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const hostElement: HTMLDivElement = host;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b1118);

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 10000);
    camera.position.set(2.8, 2.2, 3.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    hostElement.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x26313f, 2.1));
    const key = new THREE.DirectionalLight(0xffffff, 2.8);
    key.position.set(4, 7, 5);
    scene.add(key);

    const grid = new THREE.GridHelper(12, 24, 0x344254, 0x1d2732);
    scene.add(grid);

    const root = new THREE.Group();
    scene.add(root);

    function resize() {
      const width = Math.max(1, hostElement.clientWidth);
      const height = Math.max(1, hostElement.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(hostElement);

    let disposed = false;
    if (model?.remoteUrl) {
      const loader = new GLTFLoader();
      loader.load(model.remoteUrl, gltf => {
        if (disposed) return;
        root.add(gltf.scene);
        const box = new THREE.Box3().setFromObject(gltf.scene);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        gltf.scene.position.sub(center);
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        const scale = 2.4 / maxDim;
        gltf.scene.scale.setScalar(scale);
        gltf.scene.position.y = 0.05;
      });
    }

    let frame = 0;
    const clock = new THREE.Clock();
    function render() {
      frame = requestAnimationFrame(render);
      const t = clock.getElapsedTime();
      root.rotation.y = Math.sin(t * 0.18) * 0.12;
      renderer.render(scene, camera);
    }
    render();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.dispose();
      if (renderer.domElement.parentElement === hostElement) {
        hostElement.removeChild(renderer.domElement);
      }
      scene.traverse(obj => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(material)) material.forEach(m => m.dispose());
        else material?.dispose();
      });
    };
  }, [model?.id, model?.remoteUrl]);

  return <div ref={hostRef} className="real-model-viewport" aria-label="3D model viewport" />;
}
