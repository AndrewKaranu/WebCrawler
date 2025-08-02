import React, { useRef, useEffect, useState } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

interface SpiderCanvasProps {
  data?: any[];
  width?: number;
  height?: number;
  showGltfModel?: boolean;
  scale?: number;
  hideControls?: boolean;
}

const SpiderCanvas: React.FC<SpiderCanvasProps> = ({ 
  width = 800, 
  height = 600,
  scale = 0.12,
  hideControls = false
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    // Camera setup
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);  // Wider field of view
    camera.position.set(0, 5, 15);  // Center camera horizontally, position for good view
    camera.lookAt(0, -2, 0);  // Look at center point

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true 
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Add renderer to DOM
    mountRef.current.appendChild(renderer.domElement);

    // Lighting setup
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xa855f7, 0.8);
    directionalLight.position.set(10, 10, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    const pointLight = new THREE.PointLight(0xc084fc, 0.6, 100);
    pointLight.position.set(-10, -10, -10);
    scene.add(pointLight);

    // GLTF Loader
    const loader = new GLTFLoader();
    let spiderModel: THREE.Group | null = null;

    // Create a fallback cube while loading (smaller and more distinct)
    const fallbackGeometry = new THREE.BoxGeometry(1, 1, 1);
    const fallbackMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xff6b6b,  // Red color to distinguish from actual model
      emissive: 0x4c1d95,
      emissiveIntensity: 0.3
    });
    const fallbackCube = new THREE.Mesh(fallbackGeometry, fallbackMaterial);
    fallbackCube.position.set(0, -2, 0);  // Center the fallback cube
    fallbackCube.scale.setScalar(scale);  // Match spider scale
    scene.add(fallbackCube);

    // Add text to help identify loading state
    console.log('Starting GLTF model load from /models/spider.gltf');

    // Load the spider model
    loader.load(
      '/models/spider.gltf',
      (gltf) => {
        console.log('✅ GLTF loaded successfully:', gltf);
        console.log('Model scene:', gltf.scene);
        console.log('Model animations:', gltf.animations);
        
        // Remove fallback cube
        scene.remove(fallbackCube);
        
        spiderModel = gltf.scene;
        
        // Log model info
        console.log('Model bounding box before scaling:');
        const box = new THREE.Box3().setFromObject(spiderModel);
        console.log('Size:', box.getSize(new THREE.Vector3()));
        
        // Configure the model
        spiderModel.scale.setScalar(scale);  // Use prop scale for better proportion
        spiderModel.position.set(0, -2, 0);  // Center the spider model
        
        // Apply purple material theme
        let meshCount = 0;
        spiderModel.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            meshCount++;
            console.log(`Processing mesh ${meshCount}:`, child.name);
            
            if (child.material) {
              // Clone material to avoid affecting other instances
              const material = child.material.clone();
              
              if (material instanceof THREE.MeshStandardMaterial) {
                material.color.setHex(0x8b5cf6);
                material.emissive.setHex(0x4c1d95);
                material.emissiveIntensity = 0.2;
                material.metalness = 0.3;
                material.roughness = 0.7;
              }
              
              child.material = material;
              child.castShadow = true;
              child.receiveShadow = true;
            }
          }
        });
        
        console.log(`Found ${meshCount} meshes in the model`);
        
        scene.add(spiderModel);
        setIsLoading(false);
        setError(null);  // Clear any previous errors
      },
      (progress) => {
        const percent = (progress.loaded / progress.total * 100).toFixed(1);
        console.log(`📥 Loading progress: ${percent}% (${progress.loaded}/${progress.total} bytes)`);
      },
      (error) => {
        console.error('❌ Error loading GLTF:', error);
        console.error('Error details:', error instanceof Error ? error.message : String(error));
        setError('Failed to load 3D model - using fallback visualization');
        setIsLoading(false);
        
        // Keep the fallback cube if model fails to load and make it more obvious
        fallbackCube.scale.setScalar(1.5);
        fallbackCube.material.color.setHex(0xff4757);  // Bright red for error state
      }
    );

    // Mouse controls (basic orbit) - only if controls are not hidden
    let mouseX = 0;
    let mouseY = 0;
    let isMouseDown = false;

    const handleMouseDown = (event: MouseEvent) => {
      if (hideControls) return;
      isMouseDown = true;
      mouseX = event.clientX;
      mouseY = event.clientY;
    };

    const handleMouseUp = () => {
      if (hideControls) return;
      isMouseDown = false;
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (hideControls || !isMouseDown) return;
      
      const deltaX = event.clientX - mouseX;
      const deltaY = event.clientY - mouseY;
      
      if (spiderModel) {
        spiderModel.rotation.y += deltaX * 0.01;
        spiderModel.rotation.x += deltaY * 0.01;
      } else if (fallbackCube) {
        fallbackCube.rotation.y += deltaX * 0.01;
        fallbackCube.rotation.x += deltaY * 0.01;
      }
      
      mouseX = event.clientX;
      mouseY = event.clientY;
    };

    // Add event listeners only if controls are not hidden
    if (!hideControls) {
      renderer.domElement.addEventListener('mousedown', handleMouseDown);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('mousemove', handleMouseMove);
    }

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      
      if (spiderModel) {
        // Gentle floating animation for spider model (around its lower position)
        spiderModel.position.y = -3 + Math.sin(Date.now() * 0.001) * 0.2;
        // Auto rotation when not being controlled
        if (!isMouseDown) {
          spiderModel.rotation.y += 0.005;
        }
      } else if (fallbackCube) {
        // Animate fallback cube (around its lower position)
        fallbackCube.position.y = -3 + Math.sin(Date.now() * 0.001) * 0.2;
        fallbackCube.rotation.x += 0.01;
        fallbackCube.rotation.y += 0.01;
      }
      
      renderer.render(scene, camera);
    };
    
    animate();

    // Handle resize
    const handleResize = () => {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup function
    return () => {
      window.removeEventListener('resize', handleResize);
      if (!hideControls) {
        renderer.domElement.removeEventListener('mousedown', handleMouseDown);
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('mousemove', handleMouseMove);
      }
      
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      
      // Dispose of Three.js resources
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          if (object.material instanceof Array) {
            object.material.forEach(material => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
      renderer.dispose();
    };
  }, [width, height]);

  // Styling for the canvas container
  const canvasContainerSx: SxProps<Theme> = {
    borderRadius: 2,
    backdropFilter: 'blur(15px)',
    border: '1px solid rgba(168, 85, 247, 0.3)',
    position: 'relative',
    overflow: 'hidden',
    boxShadow: '0 8px 32px rgba(168, 85, 247, 0.2)',
    background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.9) 0%, rgba(30, 20, 60, 0.9) 100%)',
    width,
    height,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  };

  return (
    // @ts-ignore - Complex MUI sx prop
    <Box sx={canvasContainerSx}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
      
      {/* Loading overlay */}
      {isLoading && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0, 0, 0, 0.8)',
            zIndex: 10
          }}
        >
          <CircularProgress sx={{ color: '#a855f7', mb: 2 }} />
          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            Loading 3D Spider Model...
          </Typography>
        </Box>
      )}
      
      {/* Error overlay */}
      {error && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0, 0, 0, 0.8)',
            zIndex: 10
          }}
        >
          <Typography variant="body2" sx={{ color: 'rgba(255, 100, 100, 0.9)', textAlign: 'center' }}>
            {error}
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)', mt: 1 }}>
            Make sure spider.gltf is in /public/models/
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default SpiderCanvas;
