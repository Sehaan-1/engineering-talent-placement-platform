"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * A 3D animated WebGL scene for the login hero.
 * Renders a Sangria/Jade geometric sculpture with subtle motion.
 */
export default function ThreeHero() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(
      50,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 0, 8);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // ---- Lights ----
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(5, 6, 4);
    scene.add(keyLight);

    const jadeLight = new THREE.PointLight(0x479c73, 1.4, 20);
    jadeLight.position.set(-3, 2, 3);
    scene.add(jadeLight);

    const sangriaLight = new THREE.PointLight(0x7a1229, 1.0, 20);
    sangriaLight.position.set(3, -2, 3);
    scene.add(sangriaLight);

    // ---- Hero geometry: rounded icosahedron with jade inner sphere ----
    const group = new THREE.Group();
    scene.add(group);

    const outerGeo = new THREE.IcosahedronGeometry(1.6, 1);
    const outerMat = new THREE.MeshPhysicalMaterial({
      color: 0x7a1229,
      metalness: 0.25,
      roughness: 0.18,
      transmission: 0.5,
      thickness: 0.6,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      ior: 1.4,
      envMapIntensity: 1.4,
      transparent: true,
      opacity: 0.92,
    });
    const outer = new THREE.Mesh(outerGeo, outerMat);
    group.add(outer);

    const innerGeo = new THREE.IcosahedronGeometry(0.95, 0);
    const innerMat = new THREE.MeshStandardMaterial({
      color: 0x479c73,
      metalness: 0.7,
      roughness: 0.25,
      emissive: 0x2f7a58,
      emissiveIntensity: 0.25,
    });
    const inner = new THREE.Mesh(innerGeo, innerMat);
    group.add(inner);

    // ---- Orbiting rings ----
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.35,
    });

    const ring1 = new THREE.Mesh(
      new THREE.TorusGeometry(2.4, 0.012, 16, 200),
      ringMat
    );
    ring1.rotation.x = Math.PI / 3;
    group.add(ring1);

    const ring2 = new THREE.Mesh(
      new THREE.TorusGeometry(2.85, 0.008, 16, 200),
      ringMat
    );
    ring2.rotation.x = -Math.PI / 4;
    ring2.rotation.z = Math.PI / 6;
    group.add(ring2);

    const ring3 = new THREE.Mesh(
      new THREE.TorusGeometry(3.3, 0.006, 16, 200),
      new THREE.MeshBasicMaterial({
        color: 0x479c73,
        transparent: true,
        opacity: 0.4,
      })
    );
    ring3.rotation.y = Math.PI / 2;
    group.add(ring3);

    // ---- Floating particles (sangria dots) ----
    const particleCount = 120;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const r = 3.5 + Math.random() * 1.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    particleGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3)
    );
    const particleMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.04,
      transparent: true,
      opacity: 0.7,
      sizeAttenuation: true,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // ---- Mouse interaction ----
    let mouseX = 0;
    let mouseY = 0;
    const handlePointer = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      mouseX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      mouseY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    };
    container.addEventListener("pointermove", handlePointer);

    // ---- Resize ----
    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener("resize", handleResize);

    // ---- Animate ----
    let frameId = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const t = (now - start) / 1000;
      group.rotation.y = t * 0.3 + mouseX * 0.4;
      group.rotation.x = Math.sin(t * 0.25) * 0.15 + mouseY * 0.2;
      outer.rotation.y = t * 0.2;
      outer.rotation.x = t * 0.13;
      inner.rotation.y = -t * 0.4;
      inner.rotation.z = t * 0.18;
      ring1.rotation.z = t * 0.2;
      ring2.rotation.y = t * 0.15;
      ring3.rotation.x = t * 0.18;
      particles.rotation.y = t * 0.05;
      particles.rotation.x = t * 0.03;
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleResize);
      container.removeEventListener("pointermove", handlePointer);
      container.removeChild(renderer.domElement);
      outerGeo.dispose();
      outerMat.dispose();
      innerGeo.dispose();
      innerMat.dispose();
      ring1.geometry.dispose();
      ring2.geometry.dispose();
      ring3.geometry.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 1,
      }}
    />
  );
}
