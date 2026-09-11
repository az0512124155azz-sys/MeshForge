import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { ModelArtifact } from "../core/types";

export function ModelViewport({ model }: { model?: ModelArtifact }) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b1118);

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 10000);
    camera.position.set(2.8, 2.2, 3.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "low-power" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = false;
    host.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x26313f, 1.6));
    const key = new THREE.DirectionalLight(0xffffff, 1.8);
    key.position.set(4, 7, 5);
    scene.add(key);
    scene.add(new THREE.GridHelper(12, 20, 0x344254, 0x1d2732));

    const root = new THREE.Group();
    scene.add(root);

    const renderOnce = () => renderer.render(scene, camera);
    const resize = () => {
      const width = Math.max(1, host.clientWidth);
      const height = Math.max(1, host.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderOnce();
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(host);

    let disposed = false;
    if (model?.remoteUrl) {
      new GLTFLoader().load(model.remoteUrl, gltf => {
        if (disposed) return;
        root.add(gltf.scene);
        const box = new THREE.Box3().setFromObject(gltf.scene);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        gltf.scene.position.sub(center);
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        gltf.scene.scale.setScalar(2.4 / maxDim);
        gltf.scene.position.y = 0.05;
        renderOnce();
      });
    } else {
      renderOnce();
    }

    return () => {
      disposed = true;
      observer.disconnect();
      scene.traverse(obj => {
        const mesh = obj as THREE.Mesh;
        mesh.geometry?.dispose();
        const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(material)) material.forEach(m => m.dispose());
        else material?.dispose();
      });
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [model?.id, model?.remoteUrl]);

  return <div ref={hostRef} className="real-model-viewport" aria-label="3D model viewport" />;
}
