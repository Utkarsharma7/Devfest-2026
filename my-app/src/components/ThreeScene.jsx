"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

export default function ThreeScene() {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const animationIdRef = useRef(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    
    if (!containerRef.current) return;
    
    // Check if WebGL is supported
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
      console.error('WebGL is not supported in this browser');
      if (containerRef.current && isMountedRef.current) {
        containerRef.current.innerHTML = '<div class="text-white text-center p-4">WebGL is not supported in this browser</div>';
      }
      return;
    }
    
    // Ensure container has dimensions
    if (containerRef.current.clientWidth === 0 || containerRef.current.clientHeight === 0) {
      console.warn('Container has zero dimensions, waiting...');
      // Retry after a short delay
      const timeoutId = setTimeout(() => {
        if (isMountedRef.current && containerRef.current) {
          // Trigger re-render by updating state or re-running effect
          window.dispatchEvent(new Event('resize'));
        }
      }, 100);
      return () => clearTimeout(timeoutId);
    }

    // Prevent multiple initializations
    if (sceneRef.current) {
      return;
    }

    const initThreeScene = async () => {
      if (!isMountedRef.current || !containerRef.current) return;
      // Dynamically import BufferGeometryUtils to avoid build-time errors
      const BufferGeometryUtils = await import("three/addons/utils/BufferGeometryUtils.js");
      
      if (!isMountedRef.current || !containerRef.current) return;
      
      // Try to get mergeBufferGeometries function - check various possible names
      const mergeBufferGeometries = BufferGeometryUtils.mergeBufferGeometries || 
                                   BufferGeometryUtils.mergeGeometries || 
                                   (BufferGeometryUtils.default && (
                                     BufferGeometryUtils.default.mergeBufferGeometries || 
                                     BufferGeometryUtils.default.mergeGeometries ||
                                     (typeof BufferGeometryUtils.default === 'function' ? BufferGeometryUtils.default : null)
                                   ));
      
      if (!mergeBufferGeometries || typeof mergeBufferGeometries !== 'function') {
        console.error('mergeBufferGeometries function not found. Available exports:', Object.keys(BufferGeometryUtils));
        return;
      }

      class Postprocessing {
        constructor(scene, camera, renderer) {
          const renderScene = new RenderPass(scene, camera);
          const width = containerRef.current.clientWidth || 600;
          const height = containerRef.current.clientHeight || 600;
          const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(width, height),
            1.25,
            0.25,
            0
          );
          let samples = 4;
          const target1 = new THREE.WebGLRenderTarget(
            width,
            height,
            {
              type: THREE.FloatType,
              format: THREE.RGBAFormat,
              colorSpace: THREE.SRGBColorSpace,
              samples: samples
            }
          );
          this.bloomComposer = new EffectComposer(renderer, target1);
          this.bloomComposer.renderToScreen = false;
          this.bloomComposer.addPass(renderScene);
          this.bloomComposer.addPass(bloomPass);
          const finalPass = new ShaderPass(
            new THREE.ShaderMaterial({
              uniforms: {
                baseTexture: { value: null },
                bloomTexture: { value: this.bloomComposer.renderTarget2.texture }
              },
              vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }`,
              fragmentShader: `uniform sampler2D baseTexture; uniform sampler2D bloomTexture; varying vec2 vUv; void main() { gl_FragColor = ( texture2D( baseTexture, vUv ) + vec4( 1.0 ) * texture2D( bloomTexture, vUv ) ); }`,
              defines: {}
            }),
            "baseTexture"
          );
          finalPass.needsSwap = true;
          const target2 = new THREE.WebGLRenderTarget(
            width,
            height,
            {
              type: THREE.FloatType,
              format: THREE.RGBAFormat,
              colorSpace: THREE.SRGBColorSpace,
              samples: samples
            }
          );
          this.finalComposer = new EffectComposer(renderer, target2);
          this.finalComposer.addPass(renderScene);
          this.finalComposer.addPass(finalPass);
        }
      }

      class LightEmitterCurve extends THREE.Curve {
        constructor(radius, turns, height) {
          super();
          this.radius = radius;
          this.height = height;
          this.turns = turns;
        }

        getPoint(t, optionalTarget = new THREE.Vector3()) {
          return optionalTarget.setFromCylindricalCoords(this.radius, -Math.PI * 2 * this.turns * t, this.height * t);
        }
      }

      class LightEmitters extends THREE.Object3D {
        constructor(gu, count, maxR, height, turns, m) {
          super();
          let gsBall = [];
          let gsEmitter = [];
          let start = maxR / 4;
          let totalWidth = maxR * 0.9 - start;
          let step = totalWidth / (count - 1);
          for (let i = 0; i < count; i++) {
            let shift = start + step * i;
            let gBall = new THREE.SphereGeometry(0.05, 64, 32, 0, Math.PI * 2, 0, Math.PI * 0.5);
            gBall.translate(0, 0, shift);
            gsBall.push(gBall);
            let lightEmitterCurve = new LightEmitterCurve(shift, turns, height);
            let gEmitter = new THREE.TubeGeometry(lightEmitterCurve, 200, 0.02, 16);
            gsEmitter.push(gEmitter);
          }
          let gBalls = mergeBufferGeometries(gsBall);
          let balls = new THREE.Mesh(gBalls, m.clone());
          balls.userData.nonGlowing = true;
          this.add(balls);
          let gEmitters = mergeBufferGeometries(gsEmitter);
          let mEmitters = new THREE.MeshBasicMaterial({
            side: THREE.DoubleSide,
            color: new THREE.Color(1, 0.25, 0),
            onBeforeCompile: shader => {
              shader.uniforms.globalBloom = gu.globalBloom;
              shader.vertexShader = `varying vec3 vPos;\n${shader.vertexShader}`.replace(
                `#include <begin_vertex>`,
                `#include <begin_vertex>\nvPos = position;`
              );
              shader.fragmentShader = `#define ss(a, b, c) smoothstep(a, b, c)\nuniform float globalBloom;\nvarying vec3 vPos;\n${shader.fragmentShader}`.replace(
                `#include <dithering_fragment>`,
                `#include <dithering_fragment>\nvec3 colNonGlow = vec3(1, 0.75, 0.75);\nvec3 colGlow = gl_FragColor.rgb;\ngl_FragColor.rgb = mix(colNonGlow, colGlow, globalBloom);`
              );
            }
          });
          mEmitters.defines = { "USE_UV": "" };
          let emitters = new THREE.Mesh(gEmitters, mEmitters);
          this.add(emitters);
        }
      }

      class Belt extends THREE.Mesh {
        constructor(gu, mainSize, rBig, rSmall, width, m) {
          let m1 = m.clone();
          m1.color.set("gray");
          let hSize = mainSize;
          let path = new THREE.Shape()
            .absarc(0, 0, rBig, Math.PI * 1.5, Math.PI)
            .absarc(-hSize + rSmall, -hSize + rSmall, rSmall, Math.PI, Math.PI * 1.5)
            .lineTo(0, -hSize);
          const segs = 500;
          let pathPts = path.getSpacedPoints(segs).reverse();
          let g = new THREE.BoxGeometry(segs, 0.01, width, segs, 1, 1).translate(segs * 0.5, 0.005, 0);
          let vPrev = new THREE.Vector2(), vCurr = new THREE.Vector2(), vNext = new THREE.Vector2();
          let vCP = new THREE.Vector2(), vCN = new THREE.Vector2(), v2 = new THREE.Vector2(), cntr = new THREE.Vector2();
          let pos = g.attributes.position;
          for (let i = 0; i < pos.count; i++) {
            let idxCurr = Math.round(pos.getX(i));
            let idxPrev = idxCurr == 0 ? segs - 1 : idxCurr - 1;
            let idxNext = idxCurr == segs ? 1 : idxCurr + 1;
            vPrev.copy(pathPts[idxPrev]);
            vCurr.copy(pathPts[idxCurr]);
            vNext.copy(pathPts[idxNext]);
            vCP.subVectors(vPrev, vCurr);
            vCN.subVectors(vNext, vCurr);
            let aCP = vCP.angle();
            let aCN = vCN.angle();
            let hA = Math.PI * 0.5 - (aCP - aCN) * 0.5;
            let aspect = Math.cos(hA);
            v2.set(vCurr.x, vCurr.y).multiplyScalar(pos.getY(i) / aspect);
            v2.rotateAround(cntr, hA).add(vCurr);
            pos.setXY(i, v2.x, v2.y);
          }
          g.rotateX(-Math.PI * 0.5);
          g.computeVertexNormals();
          super(g, m1);
          this.castShadow = true;
          this.receiveShadow = true;
          this.uniforms = {
            time: { value: 0 },
            angularSpeed: { value: 0 }
          }
          m1.onBeforeCompile = shader => {
            shader.uniforms.globalBloom = gu.globalBloom;
            shader.uniforms.time = this.uniforms.time;
            shader.uniforms.beltLength = { value: rBig * Math.PI * 1.5 + rSmall * Math.PI * 0.5 + (hSize - rSmall) * 2 }
            shader.uniforms.angularSpeed = this.uniforms.angularSpeed;
            shader.uniforms.rSmall = { value: rSmall };
            shader.fragmentShader = `#define ss(a, b, c) smoothstep(a, b, c)\nuniform float globalBloom;\nuniform float time;\nuniform float beltLength;\nuniform float angularSpeed;\nuniform float rSmall;\n${shader.fragmentShader}`.replace(
              `#include <color_fragment>`,
              `#include <color_fragment>\nfloat linearSpeed = rSmall * angularSpeed;\nfloat uvX = mod(vUv.x * beltLength + time * linearSpeed, beltLength / 4.);\nfloat f = step(0.25, uvX) - step(0.75, uvX);\ndiffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.875), f);`
            ).replace(
              `#include <dithering_fragment>`,
              `#include <dithering_fragment>\ngl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0), globalBloom);`
            );
          }
          m1.defines = { "USE_UV": "" };
        }
      }

      class Roller extends THREE.Mesh {
        constructor(r, h, roundR, m) {
          let m1 = m.clone();
          let profile = new THREE.Path()
            .moveTo(0, 0)
            .lineTo(r - roundR, 0)
            .absarc(r - roundR, roundR, roundR, Math.PI * 1.5, Math.PI * 2)
            .absarc(r - roundR, h - roundR, roundR, 0, Math.PI * 0.5)
            .lineTo(0, h);
          let g = new THREE.LatheGeometry(profile.getPoints(50), 100);
          super(g, m1);
          this.castShadow = true;
          this.receiveShadow = true;
        }
      }

      class Base extends THREE.Mesh {
        constructor(w, h, R, roundR, m) {
          let angleStep = Math.PI * 0.5;
          let wwr = w - R - roundR;
          let hwrr = h - roundR * 2;
          let shape = new THREE.Shape()
            .absarc(wwr, wwr, R, angleStep * 0, angleStep * 1)
            .absarc(-wwr, wwr, R, angleStep * 1, angleStep * 2)
            .absarc(-wwr, -wwr, R, angleStep * 2, angleStep * 3)
            .absarc(wwr, -wwr, R, angleStep * 3, angleStep * 4);
          let g = new THREE.ExtrudeGeometry(shape, { depth: hwrr, bevelEnabled: true, bevelThickness: roundR, bevelSize: roundR, bevelSegments: 10, curveSegments: 20 });
          g.translate(0, 0, roundR);
          g.rotateX(-Math.PI * 0.5);
          super(g, m.clone());
          this.castShadow = true;
          this.receiveShadow = true;
        }
      }

      class Device extends THREE.Object3D {
        constructor(gu) {
          super();
          let m = new THREE.MeshLambertMaterial({ color: new THREE.Color().setScalar(0.75) });
          let base = new Base(4, 1, 0.5, 0.05, m);
          const rBig = 3.75;
          const rSmall = 0.5;
          let lightEmitters = new LightEmitters(gu, 15, rBig, rBig * 3, 1.25, m);
          lightEmitters.position.set(0, 0.25, 0);
          let rollerBig = new Roller(rBig, 0.25, 0.05, m);
          rollerBig.material.color.multiplyScalar(0.75);
          rollerBig.position.set(0, 1, 0);
          rollerBig.add(lightEmitters);
          base.add(rollerBig);
          let rotationIndicator = new THREE.Mesh(new THREE.SphereGeometry(0.05, 64, 16, 0, Math.PI * 2, 0, Math.PI * 0.5), new THREE.MeshBasicMaterial({ color: new THREE.Color(0, 0.75, 1) }));
          rotationIndicator.position.set(0.35, 0.25, 0);
          let rollerSmall = new Roller(rSmall, 0.25, 0.05, m);
          rollerSmall.material.color.multiplyScalar(0.75);
          rollerSmall.position.set(-3.25, 1, 3.25);
          rollerSmall.add(rotationIndicator);
          base.add(rollerSmall);
          let belt = new Belt(gu, rBig, rBig, rSmall, 0.125, m);
          belt.position.set(0, 1.125, 0);
          base.add(belt);
          this.add(base);
          const gearRatio = rBig / rSmall;
          const angularSpeed = Math.PI;
          belt.uniforms.angularSpeed.value = angularSpeed;
          this.update = t => {
            let time = t * angularSpeed;
            rollerSmall.rotation.y = time;
            rollerBig.rotation.y = time / gearRatio;
            belt.uniforms.time.value = t;
          }
          [rollerSmall, rollerBig, base].forEach(o => {
            o.userData.nonGlowing = true;
          })
        }
      }

      class Table extends THREE.Mesh {
        constructor(gu, bgColor) {
          let g = new THREE.PlaneGeometry(20, 20).rotateX(-Math.PI * 0.5);
          let m = new THREE.MeshLambertMaterial({
            color: new THREE.Color().setScalar(0.5).getHex(),
            onBeforeCompile: shader => {
              shader.uniforms.globalBloom = gu.globalBloom;
              shader.uniforms.bgColor = { value: new THREE.Color(bgColor) };
              shader.fragmentShader = `uniform float globalBloom;\nuniform vec3 bgColor;\n${shader.fragmentShader}`.replace(
                `#include <dithering_fragment>`,
                `#include <dithering_fragment>\nfloat uvDist = distance(vUv, vec2(0.5)) * 2.;\nfloat f = smoothstep(0.5, 1., uvDist);\ngl_FragColor.rgb = mix(gl_FragColor.rgb, bgColor, f);\ngl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0), globalBloom);`
              );
            }
          });
          m.defines = { "USE_UV": "" };
          super(g, m);
          this.receiveShadow = true;
        }
      }

      const bgColors = {
        on: 0x000000, // Keep black for final render
        off: 0x000000 // Keep black for bloom render
      }

      if (!isMountedRef.current || !containerRef.current) return;
      
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(bgColors.off);
      
      const width = containerRef.current.clientWidth || 600;
      const height = containerRef.current.clientHeight || 600;
      
      const camera = new THREE.PerspectiveCamera(45, width / height, 1, 1000);
      camera.position.set(-5, 5, 10).setLength(18);
      
      if (!isMountedRef.current || !containerRef.current) return;
      
      // Create renderer with error handling
      let renderer;
      try {
        renderer = new THREE.WebGLRenderer({ 
          antialias: false,
          powerPreference: "high-performance",
          preserveDrawingBuffer: false,
          failIfMajorPerformanceCaveat: false
        });
      } catch (error) {
        console.error('Failed to create WebGL renderer:', error);
        if (isMountedRef.current && containerRef.current) {
          containerRef.current.innerHTML = '<div class="text-white text-center p-4">Failed to initialize 3D scene. Please refresh the page.</div>';
        }
        return;
      }
      
      if (!isMountedRef.current || !containerRef.current) return;
      
      // Check if renderer context is valid
      const glContext = renderer.getContext();
      if (!glContext) {
        console.error('WebGL context could not be created');
        if (isMountedRef.current && containerRef.current) {
          containerRef.current.innerHTML = '<div class="text-white text-center p-4">WebGL context could not be created. Please refresh the page.</div>';
        }
        renderer.dispose();
        return;
      }
      
      // Check for context loss
      glContext.canvas.addEventListener('webglcontextlost', (event) => {
        event.preventDefault();
        console.warn('WebGL context lost');
      }, false);
      
      glContext.canvas.addEventListener('webglcontextrestored', () => {
        console.log('WebGL context restored');
      }, false);
      
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.setSize(width, height);
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      
      // Clear container before appending
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
        containerRef.current.appendChild(renderer.domElement);
      }

      const handleResize = () => {
        if (!containerRef.current) return;
        const newWidth = containerRef.current.clientWidth || 600;
        const newHeight = containerRef.current.clientHeight || 600;
        camera.aspect = newWidth / newHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(newWidth, newHeight);
        if (postprocessing) {
          postprocessing.bloomComposer.setSize(newWidth, newHeight);
          postprocessing.finalComposer.setSize(newWidth, newHeight);
        }
      }

      window.addEventListener("resize", handleResize);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.target.set(0, 4, 0);

      const light = new THREE.DirectionalLight(0xffffff, 0.2);
      light.castShadow = true;
      light.shadow.camera.top = 10;
      light.shadow.camera.bottom = -10;
      light.shadow.camera.left = -10;
      light.shadow.camera.right = 10;
      light.shadow.mapSize.width = 2048;
      light.shadow.mapSize.height = 2048;
      light.shadow.camera.near = 0;
      light.shadow.camera.far = 20;
      light.position.set(10, 20, 10).setLength(10);
      scene.add(light, new THREE.AmbientLight(0xffffff, 0.3));

      const gu = {
        globalBloom: { value: 0 }
      }

      const device = new Device(gu);
      scene.add(device);
      const table = new Table(gu, bgColors.on);
      scene.add(table);

      scene.traverse(child => {
        if (child.userData.nonGlowing) {
          child.material.onBeforeCompile = shader => {
            shader.uniforms.globalBloom = gu.globalBloom;
            shader.fragmentShader = `uniform float globalBloom;\n${shader.fragmentShader}`.replace(
              `#include <dithering_fragment>`,
              `#include <dithering_fragment>\ngl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0), globalBloom);`
            );
          }
        }
      })

      const postprocessing = new Postprocessing(scene, camera, renderer);
      const clock = new THREE.Clock();

      const animate = () => {
        animationIdRef.current = requestAnimationFrame(animate);
        let t = clock.getElapsedTime();
        controls.update();
        device.update(t);
        gu.globalBloom.value = 1;
        scene.background.set(bgColors.off);
        postprocessing.bloomComposer.render();
        gu.globalBloom.value = 0;
        scene.background.set(bgColors.on);
        postprocessing.finalComposer.render();
      };

      sceneRef.current = { scene, renderer, device, postprocessing, controls, clock, handleResize };
      animate();
    };

    initThreeScene().catch(err => {
      if (isMountedRef.current) {
        console.error('Error initializing Three.js scene:', err);
        if (containerRef.current) {
          containerRef.current.innerHTML = '<div class="text-white text-center p-4">Error initializing 3D scene. Please refresh the page.</div>';
        }
      }
    });

    return () => {
      isMountedRef.current = false;
      // Cancel animation frame
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }
      
      // Remove resize listener
      if (sceneRef.current && sceneRef.current.handleResize) {
        window.removeEventListener("resize", sceneRef.current.handleResize);
      }
      
      // Dispose Three.js resources
      if (sceneRef.current) {
        // Dispose controls
        if (sceneRef.current.controls) {
          sceneRef.current.controls.dispose();
        }
        
        // Dispose postprocessing
        if (sceneRef.current.postprocessing) {
          if (sceneRef.current.postprocessing.bloomComposer) {
            sceneRef.current.postprocessing.bloomComposer.dispose();
          }
          if (sceneRef.current.postprocessing.finalComposer) {
            sceneRef.current.postprocessing.finalComposer.dispose();
          }
        }
        
        // Dispose scene objects
        if (sceneRef.current.scene) {
          sceneRef.current.scene.traverse((object) => {
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
              if (Array.isArray(object.material)) {
                object.material.forEach((mat) => mat.dispose());
              } else {
                object.material.dispose();
              }
            }
          });
        }
        
        // Dispose renderer (this also disposes the WebGL context)
        if (sceneRef.current.renderer) {
          const gl = sceneRef.current.renderer.getContext();
          if (gl) {
            const loseContext = gl.getExtension('WEBGL_lose_context');
            if (loseContext) {
              loseContext.loseContext();
            }
          }
          sceneRef.current.renderer.dispose();
        }
      }
      
      // Clear container
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
      
      // Clear scene reference
      sceneRef.current = null;
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-[600px] rounded-lg overflow-hidden bg-neutral-950"
    />
  );
}
