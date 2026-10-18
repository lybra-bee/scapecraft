<script lang="ts">
  import { onMount } from 'svelte';
  import { 
    Layers, 
    Box, 
    RotateCcw, 
    Move3d, 
    Trees, 
    Camera, 
    Sliders, 
    Download, 
    Upload, 
    Wand2, 
    Rotate3d, 
    X, 
    Check, 
    Trash2, 
    Loader2, 
    Sparkles, 
    Copy, 
    FlipHorizontal, 
    Palette, 
    Save, 
    FolderOpen, 
    Play, 
    Pause, 
    Sun, 
    Moon, 
    Sunset, 
    Plus, 
    Grid, 
    Printer, 
    Compass, 
    Clock, 
    ChevronRight, 
    ChevronLeft, 
    LandPlot, 
    Castle 
  } from 'lucide-svelte';

  let currentStep = $state<1 | 2 | 3>(2); // По умолчанию сразу шаг 2 для удобства

  type TankType = 'rect' | 'cube' | 'bow' | 'cylinder' | 'sphere';
  let tankType = $state<TankType>('rect');

  let length = $state(100);
  let depth = $state(40);
  let height = $state(50);
  let radius = $state(25);

  let frontLayerCm = $state(4);
  let backLayerCm = $state(11);
  let showWater = $state(true);
  let showFish = $state(true);
  let showCaustics = $state(true);
  let showGridRule = $state(false);
  let isTopDownView = $state(false);
  let plantGrowthDays = $state(1);
  let isRendering4K = $state(false);

  function makeDraggable(node: HTMLElement) {
    let x = 0, y = 0, startX = 0, startY = 0;
    
    const onMouseDown = (e: MouseEvent) => {
      // Не инициируем drag при кликах на кнопки, ползунки, скроллбары и инпуты
      const target = e.target as HTMLElement;
      if (target.closest("button, input, select, textarea, .range-slider, .left-cards-scroll")) return;
      
      e.preventDefault();
      startX = e.clientX - x;
      startY = e.clientY - y;
      
      const onMouseMove = (ev: MouseEvent) => {
        x = ev.clientX - startX;
        y = ev.clientY - startY;
        node.style.transform = `translate(${x}px, ${y}px)`;
      };
      
      const onMouseUp = () => {
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };
      
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    };

    node.addEventListener("mousedown", onMouseDown);
    return {
      destroy() {
        node.removeEventListener("mousedown", onMouseDown);
      }
    };
  }


  type BgTheme = 'ada-sky' | 'deep-ocean' | 'mist-white' | 'dark-nature';
  let bgTheme = $state<BgTheme>('ada-sky');

  type LightMode = 'day' | 'sunset' | 'moon';
  let lightMode = $state<LightMode>('day');

  let isCinematicTour = $state(false);
  let isPassportOpen = $state(false);
  let isAiRenderOpen = $state(false);
  let aiEnhancing = $state(false);
  let aiEnhancedImage = $state<string | null>(null);
  let aiOriginalImage = $state<string | null>(null);
  let aiErrorMessage = $state<string | null>(null);

      

  async function generateAiAquascape() {
    aiEnhancing = true;
    aiErrorMessage = "";
    isAiRenderOpen = true;

    try {
      const webglCanvas = document.querySelector("canvas");
      if (!webglCanvas) {
        throw new Error("Холст сцены не найден");
      }

      const snapshotBase64 = webglCanvas.toDataURL("image/jpeg", 0.95);

      const res = await fetch("https://sunny-infections-excessive-choice.trycloudflare.com/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: snapshotBase64,
          sceneDescription: "spider wood in center, seiryu stone on right, red and green rotala plants"
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.image) {
        throw new Error(data.error || ("Ошибка сервера: " + res.status));
      }

      aiEnhancedImage = data.image;
    } catch (err: any) {
      aiErrorMessage = err?.message || "Ошибка генерации фото";
    } finally {
      aiEnhancing = false;
    }
  }


  type LibCategory = 'plants' | 'hardscape' | 'decor';
  let activeLibCategory = $state<LibCategory>('plants');

  let actionMode = $state<'drag' | 'orbit'>('drag');
  let selectedId = $state<string>('');
  let selectedLabel = $state<string>('Выберите элемент');

  let posX = $state(0);
  let posY = $state(0);
  let posZ = $state(0);
  let rotX = $state(0);
  let rotY = $state(0);
  let rotZ = $state(0);
  let scaleMultiplier = $state(1.0);

  let isUserInteractingWithSliders = false;

  let isAiModalOpen = $state(false);
  let aiObjSizeCm = $state(35);
  let aiGenerating = $state(false);
  let aiProgressPercent = $state(0);
  let aiStatusText = $state('Инициализация...');
  let uploadedImageFile = $state<File | null>(null);
  let uploadedImagePreview = $state<string | null>(null);

  let grossVolumeLiters = $derived.by(() => {
    if (tankType === 'cylinder') return Math.round((Math.PI * Math.pow(radius, 2) * height) / 1000);
    if (tankType === 'sphere') return Math.round(((4 / 3) * Math.PI * Math.pow(radius, 3)) / 1000);
    if (tankType === 'bow') return Math.round((length * (depth + 8) * height) / 1000);
    return Math.round((length * depth * height) / 1000);
  });

  let avgLayerCm = $derived((frontLayerCm + backLayerCm) / 2);
  let substrateVolumeLiters = $derived.by(() => {
    if (tankType === 'cylinder' || tankType === 'sphere') return Math.round((Math.PI * Math.pow(radius, 2) * avgLayerCm) / 1000);
    return Math.round((length * depth * avgLayerCm) / 1000);
  });

  let netWaterLiters = $derived(Math.max(8, grossVolumeLiters - substrateVolumeLiters * 0.7 - 6));
  let recFilterLph = $derived(Math.round(netWaterLiters * 6));
  let recLightLumens = $derived(Math.round(netWaterLiters * 45));
  let recCo2Bps = $derived(Math.max(1, Math.round(netWaterLiters / 45)));

  let containerElement: HTMLDivElement | null = $state(null);
  let fileInputDom: HTMLInputElement | null = $state(null);
  let jsonInputDom: HTMLInputElement | null = $state(null);
  let photoInputDom: HTMLInputElement | null = $state(null);

  let resetCameraFn: (() => void) | null = null;
  let toggleTopDownCameraFn: (() => void) | null = null;
  let rebuildGeometry: () => void = () => {};
  let updateBackdropScreen: () => void = () => {};
  let updateLightingMode: () => void = () => {};
  let selectTargetById: (id: string) => void = () => {};
  let updateTransformFromSliders = $state<() => void>(() => {});
  let deleteSelectedObject = $state<() => void>(() => {});
  let duplicateSelectedObject = $state<() => void>(() => {});
  let mirrorSelectedObject = $state<() => void>(() => {});
  let addLibraryItem: (itemKey: string) => void = () => {};
  let exportLayoutJson: () => void = () => {};
  let importLayoutJson: (jsonStr: string) => void = () => {};
  let takePhotoSnapshot = $state<() => void>(() => {});
  let loadGlbIntoScene: (url: string, name: string, targetSizeCm?: number, customId?: string) => void = () => {};
  let applyPlantGrowthEffect: () => void = () => {};

  interface SceneObjectRecord {
    id: string;
    name: string;
    category: string;
    specs: string;
  }
  let sceneItemsList = $state<SceneObjectRecord[]>([]);

  function handleFileDrop(e: DragEvent) {
    e.preventDefault();
    if (e.dataTransfer?.files?.[0]) {
      uploadedImageFile = e.dataTransfer.files[0];
      uploadedImagePreview = URL.createObjectURL(uploadedImageFile);
    }
  }

  function handlePhotoSelected(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files?.[0]) {
      uploadedImageFile = input.files[0];
      uploadedImagePreview = URL.createObjectURL(input.files[0]);
    }
  }

  async function generate3DFromPhoto() {
    if (!uploadedImageFile) {
      alert('Пожалуйста, выберите фото коряги или камня!');
      return;
    }

    aiGenerating = true;
    aiProgressPercent = 5;
    aiStatusText = 'Отправка фото в Tripo3D...';

    try {
      const form = new FormData();
      form.append('image', uploadedImageFile);

      const res = await fetch('/api/generate-3d', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Ошибка старта');

      const taskId = data.taskId;
      aiProgressPercent = 10;
      aiStatusText = 'Нейросеть строит модель...';

      let modelUrl = '';
      let isDone = false;
      let attempts = 0;

      while (!isDone && attempts < 100) {
        await new Promise(r => setTimeout(r, 2500));
        attempts++;

        const checkRes = await fetch(`/api/generate-3d?taskId=${taskId}`);
        const checkData = await checkRes.json();
        if (checkData.error) throw new Error(checkData.error);

        if (checkData.status === 'queued') {
          aiStatusText = `В очереди (${attempts}/100)...`;
          aiProgressPercent = Math.min(25, 10 + attempts);
        } else if (checkData.status === 'running') {
          aiProgressPercent = Math.max(30, checkData.progress || 40);
          aiStatusText = `Генерация PBR геометрии (${aiProgressPercent}%)...`;
        } else if (checkData.status === 'success' && checkData.modelUrl) {
          modelUrl = checkData.modelUrl;
          aiProgressPercent = 100;
          aiStatusText = 'Готово! Добавление в аквариум...';
          isDone = true;
        }
      }

      if (!modelUrl) throw new Error('Превышено время ожидания ответа');

      loadGlbIntoScene(modelUrl, 'ИИ Коряга по фото', aiObjSizeCm);

      isAiModalOpen = false;
      uploadedImageFile = null;
      uploadedImagePreview = null;
    } catch (err: any) {
      console.error(err);
      alert('Ошибка: ' + err.message);
    } finally {
      aiGenerating = false;
    }
  }

  onMount(async () => {
    if (!containerElement || typeof window === 'undefined') return;

    let w = containerElement.clientWidth || window.innerWidth;
    let h = containerElement.clientHeight || window.innerHeight;

    const THREE = await import('three');
    const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');
    const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x040d1a);

    const camera = new THREE.PerspectiveCamera(35, w / h, 0.1, 1000);
    camera.position.set(0, 24, 150);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    containerElement.appendChild(renderer.domElement);

    const orbit = new OrbitControls(camera, renderer.domElement);
    orbit.enableDamping = true;
    orbit.dampingFactor = 0.05;
    orbit.target.set(0, 0, 0);
    orbit.maxPolarAngle = Math.PI / 2 - 0.02;

    resetCameraFn = () => {
      camera.position.set(0, 24, 150);
      orbit.target.set(0, 0, 0);
      orbit.update();
      isTopDownView = false;
    };

    toggleTopDownCameraFn = () => {
      isTopDownView = !isTopDownView;
      if (isTopDownView) {
        camera.position.set(0, 160, 0.001);
        orbit.target.set(0, 0, 0);
      } else {
        camera.position.set(0, 24, 150);
        orbit.target.set(0, 0, 0);
      }
      orbit.update();
    };

    // Фоновый экран ADA
    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = 1024;
    bgCanvas.height = 512;
    const bgCtx = bgCanvas.getContext('2d')!;
    const bgTexture = new THREE.CanvasTexture(bgCanvas);
    bgTexture.colorSpace = THREE.SRGBColorSpace;

    updateBackdropScreen = () => {
      bgCtx.clearRect(0, 0, 1024, 512);
      if (bgTheme === 'ada-sky') {
        const grad = bgCtx.createLinearGradient(0, 512, 0, 0);
        grad.addColorStop(0, '#061d33');
        grad.addColorStop(0.3, '#0b4d7c');
        grad.addColorStop(0.7, '#38bdf8');
        grad.addColorStop(1, '#ffffff');
        bgCtx.fillStyle = grad;
        bgCtx.fillRect(0, 0, 1024, 512);

        const glow = bgCtx.createRadialGradient(512, 220, 10, 512, 220, 400);
        glow.addColorStop(0, 'rgba(255, 255, 255, 0.65)');
        glow.addColorStop(0.5, 'rgba(224, 242, 254, 0.2)');
        glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
        bgCtx.fillStyle = glow;
        bgCtx.fillRect(0, 0, 1024, 512);
      } else if (bgTheme === 'deep-ocean') {
        const grad = bgCtx.createLinearGradient(0, 512, 0, 0);
        grad.addColorStop(0, '#020b14');
        grad.addColorStop(0.4, '#04223d');
        grad.addColorStop(0.85, '#0284c7');
        grad.addColorStop(1, '#7dd3fc');
        bgCtx.fillStyle = grad;
        bgCtx.fillRect(0, 0, 1024, 512);
      } else if (bgTheme === 'mist-white') {
        const grad = bgCtx.createLinearGradient(0, 512, 0, 0);
        grad.addColorStop(0, '#cbd5e1');
        grad.addColorStop(0.5, '#e2e8f0');
        grad.addColorStop(1, '#ffffff');
        bgCtx.fillStyle = grad;
        bgCtx.fillRect(0, 0, 1024, 512);
      } else if (bgTheme === 'dark-nature') {
        const grad = bgCtx.createLinearGradient(0, 512, 0, 0);
        grad.addColorStop(0, '#020617');
        grad.addColorStop(0.5, '#091e2b');
        grad.addColorStop(1, '#0f384c');
        bgCtx.fillStyle = grad;
        bgCtx.fillRect(0, 0, 1024, 512);
      }
      bgTexture.needsUpdate = true;
    };

    const screenGeo = new THREE.PlaneGeometry(320, 160);
    const screenMat = new THREE.MeshBasicMaterial({ map: bgTexture, depthWrite: false });
    const screenMesh = new THREE.Mesh(screenGeo, screenMat);
    screenMesh.position.set(0, 15, -95);
    scene.add(screenMesh);
    updateBackdropScreen();

    // Освещение
    const ambLight = new THREE.AmbientLight(0xdbeafe, 1.8);
    scene.add(ambLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x0f2b48, 1.2);
    scene.add(hemiLight);

    const topLedLight = new THREE.SpotLight(0xffffff, 7.5);
    topLedLight.position.set(0, 95, 25);
    topLedLight.angle = Math.PI / 3;
    topLedLight.penumbra = 0.45;
    topLedLight.castShadow = true;
    topLedLight.shadow.mapSize.width = 2048;
    topLedLight.shadow.mapSize.height = 2048;
    topLedLight.shadow.bias = -0.0003;
    scene.add(topLedLight);

    const backRimLight = new THREE.DirectionalLight(0x7dd3fc, 2.0);
    backRimLight.position.set(0, 20, -70);
    scene.add(backRimLight);

    updateLightingMode = () => {
      if (lightMode === 'day') {
        renderer.toneMappingExposure = 1.35;
        ambLight.color.setHex(0xdbeafe);
        ambLight.intensity = 1.8;
        topLedLight.color.setHex(0xffffff);
        topLedLight.intensity = 7.5;
        backRimLight.color.setHex(0x7dd3fc);
        backRimLight.intensity = 2.0;
      } else if (lightMode === 'sunset') {
        renderer.toneMappingExposure = 1.25;
        ambLight.color.setHex(0xfeb272);
        ambLight.intensity = 1.5;
        topLedLight.color.setHex(0xffaa44);
        topLedLight.intensity = 6.0;
        backRimLight.color.setHex(0xf97316);
        backRimLight.intensity = 3.5;
      } else if (lightMode === 'moon') {
        renderer.toneMappingExposure = 0.95;
        ambLight.color.setHex(0x1e3a8a);
        ambLight.intensity = 0.8;
        topLedLight.color.setHex(0x38bdf8);
        topLedLight.intensity = 2.5;
        backRimLight.color.setHex(0x1d4ed8);
        backRimLight.intensity = 1.5;
      }
    };

    const tankGroup = new THREE.Group();
    const cabinetGroup = new THREE.Group();
    const lampGroup = new THREE.Group();
    const roomGroup = new THREE.Group();
    scene.add(cabinetGroup);
    scene.add(lampGroup);
    scene.add(roomGroup);

      // Мягкий интерьерный свет комнаты
      const roomAmbientWarm = new THREE.DirectionalLight(0xffecd2, 1.4);
      roomAmbientWarm.position.set(-120, 160, 100);
      roomAmbientWarm.castShadow = true;
      roomAmbientWarm.shadow.bias = -0.001;
      roomGroup.add(roomAmbientWarm);
  
    scene.add(tankGroup);

    let interactiveObjects: any[] = [];

    // Текстура грунта
    const soilCanvas = document.createElement('canvas');
    soilCanvas.width = 512;
    soilCanvas.height = 512;
    const sCtx = soilCanvas.getContext('2d')!;
    sCtx.fillStyle = '#140c06';
    sCtx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 1800; i++) {
      const rx = Math.random() * 512;
      const ry = Math.random() * 512;
      const r = 2.5 + Math.random() * 4.5;
      sCtx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      sCtx.beginPath();
      sCtx.arc(rx + 1, ry + 1.5, r, 0, Math.PI * 2);
      sCtx.fill();

      const grad = sCtx.createRadialGradient(rx - 1, ry - 1, 0.5, rx, ry, r);
      grad.addColorStop(0, '#3d2516');
      grad.addColorStop(0.6, '#1a1009');
      grad.addColorStop(1, '#0a0502');
      sCtx.fillStyle = grad;
      sCtx.beginPath();
      sCtx.arc(rx, ry, r, 0, Math.PI * 2);
      sCtx.fill();
    }
    const soilTex = new THREE.CanvasTexture(soilCanvas);
    soilTex.wrapS = THREE.RepeatWrapping;
    soilTex.wrapT = THREE.RepeatWrapping;
    soilTex.repeat.set(8, 5);

    const soilMat = new THREE.MeshStandardMaterial({
      map: soilTex,
      bumpMap: soilTex,
      bumpScale: 0.6,
      roughness: 0.85,
      metalness: 0.05
    });

    const optiwhiteMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transmission: 0.95,
      opacity: 1.0,
      transparent: true,
      roughness: 0.02,
      metalness: 0.05,
      ior: 1.52,
      thickness: 1.2,
      specularIntensity: 1.0,
      depthWrite: false
    });

    const glassEdgeMat = new THREE.MeshStandardMaterial({
      color: 0x059669,
      roughness: 0.1,
      metalness: 0.2,
      transparent: true,
      opacity: 0.85,
      depthWrite: false
    });

    const waterMat = new THREE.MeshPhysicalMaterial({
        color: 0x0284c7,
        transmission: 0.6,
        transparent: true,
        opacity: 0.35,
        roughness: 0.05,
        ior: 1.333,
        reflectivity: 0.5,
        depthWrite: false, // позволяет видеть объекты внутри и сзади без багов сортировки
        depthTest: true
      });

    let glassMeshGroup: any = null;
    let waterMesh: any = null;
    let soilGroup: any = null;

    function getSoilSurfaceY(x: number, z: number): number {
      const halfH = height / 2;
      const halfD = depth / 2;
      const t = Math.max(0, Math.min(1, (z + halfD) / (depth || 1)));
      const baseH = (1 - t) * backLayerCm + t * frontLayerCm;
      const mound = Math.exp(-Math.pow((x - 8) / 18, 2) - Math.pow((z + 2) / 12, 2)) * 3.5;
      return -halfH + baseH + mound;
    }

    rebuildGeometry = () => {
      if (glassMeshGroup) tankGroup.remove(glassMeshGroup);
      if (waterMesh) tankGroup.remove(waterMesh);
      if (soilGroup) tankGroup.remove(soilGroup);

      const halfH = height / 2;
      const halfW = length / 2;
      const halfD = depth / 2;
      const glassThick = 0.8;

      glassMeshGroup = new THREE.Group();
      glassMeshGroup.renderOrder = 10;
      soilGroup = new THREE.Group();
      soilGroup.renderOrder = 1;

      if (tankType === 'cylinder') {
        const r = radius;
        const cylGlass = new THREE.Mesh(new THREE.CylinderGeometry(r, r, height, 48, 1, true), optiwhiteMat);
        glassMeshGroup.add(cylGlass);

        const cylBottom = new THREE.Mesh(new THREE.CircleGeometry(r, 48), optiwhiteMat);
        cylBottom.rotation.x = -Math.PI / 2;
        cylBottom.position.y = -halfH;
        glassMeshGroup.add(cylBottom);

        const topRim = new THREE.Mesh(new THREE.TorusGeometry(r, 0.35, 8, 48), glassEdgeMat);
        topRim.rotation.x = Math.PI / 2;
        topRim.position.y = halfH;
        glassMeshGroup.add(topRim);

        if (showWater) {
          waterMesh = new THREE.Mesh(new THREE.CylinderGeometry(r - 0.5, r - 0.5, height - 3, 48), waterMat);
          waterMesh.position.y = -1.5;
          waterMesh.renderOrder = 3;
          tankGroup.add(waterMesh);
        }

        const sGeo = new THREE.CylinderGeometry(r - 0.6, r - 0.6, avgLayerCm, 48);
        const sMesh = new THREE.Mesh(sGeo, soilMat);
        sMesh.position.y = -halfH + avgLayerCm / 2;
        soilGroup.add(sMesh);
      } else if (tankType === 'sphere') {
        const r = radius;
        const sphereGlass = new THREE.Mesh(new THREE.SphereGeometry(r, 48, 32, 0, Math.PI * 2, 0, Math.PI * 0.85), optiwhiteMat);
        glassMeshGroup.add(sphereGlass);

        const topRim = new THREE.Mesh(new THREE.TorusGeometry(r * Math.sin(Math.PI * 0.85), 0.35, 8, 48), glassEdgeMat);
        topRim.rotation.x = Math.PI / 2;
        topRim.position.y = r * Math.cos(Math.PI * 0.85);
        glassMeshGroup.add(topRim);

        if (showWater) {
          waterMesh = new THREE.Mesh(new THREE.SphereGeometry(r - 0.5, 48, 32, 0, Math.PI * 2, 0, Math.PI * 0.75), waterMat);
          waterMesh.renderOrder = 3;
          tankGroup.add(waterMesh);
        }

        const sGeo = new THREE.CylinderGeometry(r * 0.75, r * 0.7, frontLayerCm + 3, 36);
        const sMesh = new THREE.Mesh(sGeo, soilMat);
        sMesh.position.y = -r + (frontLayerCm + 3) / 2;
        soilGroup.add(sMesh);
      } else {
        const backGlass = new THREE.Mesh(new THREE.BoxGeometry(length, height, glassThick), optiwhiteMat);
        backGlass.position.set(0, 0, -halfD);
        glassMeshGroup.add(backGlass);

        const leftGlass = new THREE.Mesh(new THREE.BoxGeometry(glassThick, height, depth - glassThick * 2), optiwhiteMat);
        leftGlass.position.set(-halfW, 0, 0);
        glassMeshGroup.add(leftGlass);

        const rightGlass = leftGlass.clone();
        rightGlass.position.set(halfW, 0, 0);
        glassMeshGroup.add(rightGlass);

        const bottomGlass = new THREE.Mesh(new THREE.BoxGeometry(length, glassThick, depth), optiwhiteMat);
        bottomGlass.position.set(0, -halfH, 0);
        glassMeshGroup.add(bottomGlass);

        if (tankType === 'bow') {
          const bowGeo = new THREE.CylinderGeometry(length * 0.8, length * 0.8, height, 48, 1, true, Math.PI * 0.28, Math.PI * 0.44);
          const bowFront = new THREE.Mesh(bowGeo, optiwhiteMat);
          bowFront.position.set(0, 0, -halfD + 8);
          glassMeshGroup.add(bowFront);
        } else {
          const frontGlass = new THREE.Mesh(new THREE.BoxGeometry(length, height, glassThick), optiwhiteMat);
          frontGlass.position.set(0, 0, halfD);
          glassMeshGroup.add(frontGlass);
        }

        const topEdgeFront = new THREE.Mesh(new THREE.BoxGeometry(length, 0.25, glassThick), glassEdgeMat);
        topEdgeFront.position.set(0, halfH + 0.12, halfD);
        glassMeshGroup.add(topEdgeFront);

        const topEdgeLeft = new THREE.Mesh(new THREE.BoxGeometry(glassThick, 0.25, depth), glassEdgeMat);
        topEdgeLeft.position.set(-halfW, halfH + 0.12, 0);
        glassMeshGroup.add(topEdgeLeft);

        const topEdgeRight = topEdgeLeft.clone();
        topEdgeRight.position.set(halfW, halfH + 0.12, 0);
        glassMeshGroup.add(topEdgeRight);

        if (showWater) {
          waterMesh = new THREE.Mesh(new THREE.BoxGeometry(length - 1.2, height - 3.5, depth - 1.2), waterMat);
          waterMesh.position.y = -1.75;
          waterMesh.renderOrder = 3;
          tankGroup.add(waterMesh);
        }

        const segX = 40;
        const segZ = 30;
        const soilGeo = new THREE.PlaneGeometry(length - 1.2, depth - 1.2, segX, segZ);
        soilGeo.rotateX(-Math.PI / 2);

        const pos = soilGeo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const pz = pos.getZ(i);
          const px = pos.getX(i);
          pos.setY(i, getSoilSurfaceY(px, pz));
        }
        soilGeo.computeVertexNormals();
        const soilTopMesh = new THREE.Mesh(soilGeo, soilMat);
        soilTopMesh.receiveShadow = true;
        soilGroup.add(soilTopMesh);

        const frontCutGeo = new THREE.PlaneGeometry(length - 1.2, frontLayerCm);
        const frontCutMesh = new THREE.Mesh(frontCutGeo, soilMat);
        frontCutMesh.position.set(0, -halfH + frontLayerCm / 2, halfD - 0.6);
        soilGroup.add(frontCutMesh);

        function createSideSlope(isLeft: boolean) {
          const shape = new THREE.Shape();
          shape.moveTo(-halfD + 0.6, 0);
          shape.lineTo(halfD - 0.6, 0);
          shape.lineTo(halfD - 0.6, frontLayerCm);
          shape.lineTo(-halfD + 0.6, backLayerCm);
          shape.closePath();

          const sideGeo = new THREE.ShapeGeometry(shape);
          const sideMesh = new THREE.Mesh(sideGeo, soilMat);
          sideMesh.rotation.y = isLeft ? Math.PI / 2 : -Math.PI / 2;
          sideMesh.position.set(isLeft ? -halfW + 0.6 : halfW - 0.6, -halfH, 0);
          return sideMesh;
        }
        soilGroup.add(createSideSlope(true));
        soilGroup.add(createSideSlope(false));
      }

      tankGroup.add(glassMeshGroup);
      tankGroup.add(soilGroup);

      // Очистка предыдущей геометрии интерьера
      while (cabinetGroup.children.length > 0) cabinetGroup.remove(cabinetGroup.children[0]);
      while (lampGroup.children.length > 0) lampGroup.remove(lampGroup.children[0]);
      while (roomGroup.children.length > 0) roomGroup.remove(roomGroup.children[0]);

      
      // Процедурные текстуры для реалистичного интерьера
      
      function createParquetTexture() {
        const cvs = document.createElement("canvas");
        cvs.width = 512; cvs.height = 512;
        const ctx = cvs.getContext("2d");
        if (!ctx) return new THREE.Texture();
        ctx.fillStyle = "#33241b";
        ctx.fillRect(0, 0, 512, 512);
        const plankH = 32;
        for (let y = 0; y < 512; y += plankH) {
          const shift = (Math.floor(y / plankH) % 2) * 128;
          for (let x = -128; x < 512; x += 128) {
            const plankX = x + shift;
            const shade = Math.floor(Math.random() * 25 - 12);
            ctx.fillStyle = "rgb(" + (55 + shade) + "," + (38 + shade) + "," + (28 + Math.floor(shade * 0.8)) + ")";
            ctx.fillRect(plankX + 1, y + 1, 126, plankH - 2);
            ctx.strokeStyle = "rgba(20, 14, 10, 0.08)";
            ctx.lineWidth = 1;
            ctx.strokeRect(plankX, y, 128, plankH);
          }
        }
        const tex = new THREE.CanvasTexture(cvs);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(1.5, 2.5);
        return tex;
      }

      function createLightScreenTexture() {
        const cvs = document.createElement("canvas");
        cvs.width = 512; cvs.height = 512;
        const ctx = cvs.getContext("2d");
        if (!ctx) return new THREE.Texture();
        const grad = ctx.createLinearGradient(0, 512, 0, 0);
        grad.addColorStop(0, "#ffffff");
        grad.addColorStop(0.35, "#e0f2fe");
        grad.addColorStop(0.75, "#7dd3fc");
        grad.addColorStop(1, "#38bdf8");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 512, 512);
        return new THREE.CanvasTexture(cvs);
      }

      
      function createWaterNormalMap() {
        const cvs = document.createElement("canvas");
        cvs.width = 512; cvs.height = 512;
        const ctx = cvs.getContext("2d");
        if (!ctx) return new THREE.Texture();
        const imgData = ctx.createImageData(512, 512);
        for (let i = 0; i < 512 * 512 * 4; i += 4) {
          const x = (i / 4) % 512;
          const y = Math.floor((i / 4) / 512);
          const v = Math.sin(x * 0.08) * Math.cos(y * 0.08) * 127 + 128;
          imgData.data[i] = v;     // R
          imgData.data[i + 1] = v; // G
          imgData.data[i + 2] = 255; // B (normal vector up)
          imgData.data[i + 3] = 255;
        }
        ctx.putImageData(imgData, 0, 0);
        const tex = new THREE.CanvasTexture(cvs);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(4, 4);
        return tex;
      }

      
      function createRockTexture() {
        const cvs = document.createElement("canvas");
        cvs.width = 512; cvs.height = 512;
        const ctx: any = cvs.getContext("2d");
        if (!ctx) return new THREE.Texture();
        
        ctx.fillStyle = "#4a5568";
        ctx.fillRect(0, 0, 512, 512);

        // Накладываем пятна и градиенты темного и светлого сланца
        for (let i = 0; i < 2000; i++) {
          const x = Math.random() * 512;
          const y = Math.random() * 512;
          const r = Math.random() * 12 + 2;
          ctx.fillStyle = Math.random() > 0.5 ? "rgba(30, 41, 59, 0.4)" : "rgba(100, 116, 139, 0.3)";
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        }

        // Прорисовываем белые кварцевые прожилки
        ctx.strokeStyle = "rgba(241, 245, 249, 0.65)";
        for (let i = 0; i < 18; i++) {
          ctx.lineWidth = Math.random() * 2.5 + 0.5;
          ctx.beginPath();
          let px = Math.random() * 512;
          let py = Math.random() * 512;
          ctx.moveTo(px, py);
          for (let s = 0; s < 5; s++) {
            px += (Math.random() - 0.4) * 80;
            py += (Math.random() - 0.5) * 60;
            ctx.lineTo(px, py);
          }
          ctx.stroke();
        }

        const tex = new THREE.CanvasTexture(cvs);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        return tex;
      }

      function createCausticTexture() {
        const cvs = document.createElement("canvas");
        cvs.width = 512; cvs.height = 512;
        const ctx: any = cvs.getContext("2d");
        if (!ctx) return new THREE.Texture();

        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, 512, 512);

        ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
        ctx.lineWidth = 2.5;
        for (let i = 0; i < 60; i++) {
          ctx.beginPath();
          let x = Math.random() * 512;
          let y = Math.random() * 512;
          ctx.moveTo(x, y);
          for (let j = 0; j < 4; j++) {
            x += (Math.random() - 0.5) * 70;
            y += (Math.random() - 0.5) * 70;
            ctx.quadraticCurveTo(x + 20, y - 20, x, y);
          }
          ctx.stroke();
        }
        const tex = new THREE.CanvasTexture(cvs);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(3, 3);
        return tex;
      }

      function createWoodTexture() {
        const cvs = document.createElement("canvas");
        cvs.width = 512; cvs.height = 512;
        const ctx: any = cvs.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#261d17";
          ctx.fillRect(0, 0, 512, 512);
          for (let i = 0; i < 400; i++) {
            ctx.strokeStyle = Math.random() > 0.5 ? "rgba(55, 40, 30, 0.35)" : "rgba(20, 14, 10, 0.4)";
            ctx.lineWidth = Math.random() * 4 + 1;
            ctx.beginPath();
            const y = Math.random() * 512;
            ctx.moveTo(0, y);
            ctx.bezierCurveTo(170, y + (Math.random() - 0.5) * 20, 340, y + (Math.random() - 0.5) * 20, 512, y);
            ctx.stroke();
          }
        }
        const tex = new THREE.CanvasTexture(cvs);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(1.5, 3);
        return tex;
      }

      const cabinetH = 75; // высота тумбы
      const floorY = -halfH - cabinetH;

      // Материалы
      const woodTex = createWoodTexture();
      const cabinetWoodMat = new THREE.MeshStandardMaterial({ 
        map: woodTex,
        roughness: 0.65, 
        metalness: 0.05 
      });
      const padMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9 });
      const lampMetalMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.85, roughness: 0.25 });
      const lampLedMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffedd5, emissiveIntensity: 4.5 });
      const lampLegMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 0.92, roughness: 0.05, transparent: true });
      const wallCvs = document.createElement("canvas");
      wallCvs.width = 512; wallCvs.height = 512;
      const wCtx: any = wallCvs.getContext("2d");
      if (wCtx) {
        const radGrad = wCtx.createRadialGradient(256, 200, 30, 256, 256, 320);
        radGrad.addColorStop(0, "#ece8e1");
        radGrad.addColorStop(0.5, "#d6cfc5");
        radGrad.addColorStop(1, "#b3a99c");
        wCtx.fillStyle = radGrad;
        wCtx.fillRect(0, 0, 512, 512);
      }
      const wallMat = new THREE.MeshStandardMaterial({
        map: new THREE.CanvasTexture(wallCvs),
        roughness: 0.95
      });
      const floorMat = new THREE.MeshStandardMaterial({ 
        map: createParquetTexture(), 
        roughness: 0.5, 
        metalness: 0.1 
      });

      // Подложка под аквариум
      const pad = new THREE.Mesh(new THREE.BoxGeometry(length + 0.6, 0.6, depth + 0.6), padMat);
      pad.position.set(0, -halfH - 0.3, 0);
      pad.receiveShadow = true;
      cabinetGroup.add(pad);

      // Тумба
      const cabBody = new THREE.Mesh(new THREE.BoxGeometry(length, cabinetH - 0.6, depth), cabinetWoodMat);
      cabBody.position.set(0, -halfH - (cabinetH / 2) - 0.3, 0);
      cabBody.castShadow = true;
      cabBody.receiveShadow = true;
      cabinetGroup.add(cabBody);

      const cabLine = new THREE.Mesh(new THREE.BoxGeometry(0.3, cabinetH - 4, 0.3), new THREE.MeshBasicMaterial({ color: 0x0f0b08 }));
      cabLine.position.set(0, -halfH - (cabinetH / 2) - 0.3, depth / 2 + 0.1);
      cabinetGroup.add(cabLine);

      // ADA Light Screen панель
      const adaScreenCvs = document.createElement("canvas");
      adaScreenCvs.width = 512; adaScreenCvs.height = 512;
      const sCtx: any = adaScreenCvs.getContext("2d");
      if (sCtx) {
        const grad = sCtx.createLinearGradient(0, 512, 0, 0);
        grad.addColorStop(0, "#ffffff");
        grad.addColorStop(0.3, "#e0f2fe");
        grad.addColorStop(0.7, "#7dd3fc");
        grad.addColorStop(1, "#0284c7");
        sCtx.fillStyle = grad;
        sCtx.fillRect(0, 0, 512, 512);
      }
      const adaScreenTex = new THREE.CanvasTexture(adaScreenCvs);
      const lightScreenMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(length - 0.4, height - 0.4),
        new THREE.MeshBasicMaterial({ map: adaScreenTex, side: THREE.FrontSide, transparent: true, opacity: 0.95, depthWrite: false })
      );
      lightScreenMesh.position.set(0, 0, -halfD + 0.3);
      cabinetGroup.add(lightScreenMesh);
  

      // Светильник WRGB над аквариумом
      const lampL = Math.max(30, length - 4);
      const lampW = 10;
      const lampElevation = halfH + 11;

      const lampBody = new THREE.Mesh(new THREE.BoxGeometry(lampL, 1.4, lampW), lampMetalMat);
      lampBody.position.set(0, lampElevation, 0);
      lampBody.castShadow = true;
      lampGroup.add(lampBody);

      const lampLed = new THREE.Mesh(new THREE.BoxGeometry(lampL - 2, 0.2, lampW - 2), lampLedMat);
      lampLed.position.set(0, lampElevation - 0.7, 0);
      lampGroup.add(lampLed);

      // Направленный свет светильника на хардскейп
      const aquariumSpotLight = new THREE.SpotLight(0xfff7ed, 4.0, 180, Math.PI / 3, 0.4, 1.2);
      aquariumSpotLight.position.set(0, halfH + 11, 0);
      aquariumSpotLight.target.position.set(0, -halfH, 0);
      aquariumSpotLight.castShadow = true;
      scene.add(aquariumSpotLight.target);
      lampGroup.add(aquariumSpotLight);
  

      const legL = new THREE.Mesh(new THREE.BoxGeometry(1.0, 11, lampW), lampLegMat);
      legL.position.set(-halfW + 0.6, halfH + 5.5, 0);
      lampGroup.add(legL);

      const legR = legL.clone();
      legR.position.set(halfW - 0.6, halfH + 5.5, 0);
      lampGroup.add(legR);

      // Интерьер комнаты: стена и паркет
      const wallMesh = new THREE.Mesh(new THREE.PlaneGeometry(800, 450), wallMat);
      wallMesh.position.set(0, floorY + 225, -halfD - 75);
      wallMesh.receiveShadow = true;
      roomGroup.add(wallMesh);

      const floorMesh = new THREE.Mesh(new THREE.PlaneGeometry(800, 500), floorMat);
      floorMesh.rotation.x = -Math.PI / 2;
      floorMesh.position.set(0, floorY, 150);
      floorMesh.receiveShadow = true;
      roomGroup.add(floorMesh);

      const baseboard = new THREE.Mesh(new THREE.BoxGeometry(800, 9, 2), cabinetWoodMat);
      baseboard.position.set(0, floorY + 4.5, -halfD - 74);
      roomGroup.add(baseboard);

      
      function createWallArtTexture(type: any) {
        const cvs = document.createElement("canvas");
        cvs.width = 256; cvs.height = 360;
        const ctx: any = cvs.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#f5f3ef";
          ctx.fillRect(0, 0, 256, 360);
          ctx.fillStyle = "#e2d9cc";
          ctx.fillRect(16, 16, 224, 328);
          ctx.fillStyle = type === 1 ? "#2e4a3d" : "#3b342f";
          ctx.beginPath();
          ctx.arc(128, 160, 60, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#a89b88";
          ctx.beginPath();
          ctx.arc(128, 240, 40, 0, Math.PI * 2);
          ctx.fill();
        }
        return new THREE.CanvasTexture(cvs);
      }

      // Картины на стене над тумбой
      const frameMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.6 });
      [-length * 0.95, length * 0.95].forEach((posX, idx) => {
        const frame = new THREE.Mesh(new THREE.BoxGeometry(26, 36, 1.2), frameMat);
        frame.position.set(posX, 0, -halfD - 73);
        const art = new THREE.Mesh(new THREE.PlaneGeometry(23, 33), new THREE.MeshBasicMaterial({ map: createWallArtTexture(idx + 1) }));
        art.position.set(posX, 0, -halfD - 72.3);
        roomGroup.add(frame);
        roomGroup.add(art);
      });


      if (typeof screenMesh !== "undefined") {
        screenMesh.scale.set(length / 280, height / 140, 1);
        screenMesh.position.set(0, 0, -halfD - 2);
      }
    };
    rebuildGeometry();

    const selectionRing = new THREE.Mesh(
      new THREE.RingGeometry(7, 8.2, 32),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide })
    );
    selectionRing.rotation.x = -Math.PI / 2;
    selectionRing.visible = false;
    scene.add(selectionRing);

    function getSelectedGroup(): any {
      return interactiveObjects.find(o => o.userData?.id === selectedId) || null;
    }

    function syncSlidersFromObject() {
      if (isUserInteractingWithSliders) return;
      const obj = getSelectedGroup();
      if (!obj) {
        selectionRing.visible = false;
        selectedLabel = 'Ничего не выбрано';
        return;
      }
      posX = Math.round(obj.position.x * 10) / 10;
      posY = Math.round(obj.position.y * 10) / 10;
      posZ = Math.round(obj.position.z * 10) / 10;
      rotX = Math.round((obj.rotation.x * 180) / Math.PI);
      rotY = Math.round((obj.rotation.y * 180) / Math.PI);
      rotZ = Math.round((obj.rotation.z * 180) / Math.PI);

      scaleMultiplier = obj.userData?.scaleMultiplier || 1.0;
      selectedLabel = obj.userData?.name || 'Элемент';
      selectionRing.position.set(obj.position.x, obj.position.y - 1, obj.position.z);
      selectionRing.visible = true;
    }

    selectTargetById = (id: string) => {
      selectedId = id;
      syncSlidersFromObject();
    };

    updateTransformFromSliders = () => {
      isUserInteractingWithSliders = true;
      const obj = getSelectedGroup();
      if (!obj) {
        isUserInteractingWithSliders = false;
        return;
      }

      obj.position.set(posX, posY, posZ);
      obj.rotation.x = (rotX * Math.PI) / 180;
      obj.rotation.y = (rotY * Math.PI) / 180;
      obj.rotation.z = (rotZ * Math.PI) / 180;

      const baseScale = obj.userData?.baseScale || 1.0;
      const isFlipped = (obj.userData?.isFlipped ?? false) ? -1 : 1;
      const finalScale = baseScale * scaleMultiplier;

      obj.scale.set(finalScale * isFlipped, finalScale, finalScale);
      obj.userData.scaleMultiplier = scaleMultiplier;

      selectionRing.position.set(posX, posY - 1, posZ);
      setTimeout(() => { isUserInteractingWithSliders = false; }, 50);
    };

    deleteSelectedObject = () => {
      const obj = getSelectedGroup();
      if (!obj) return;
      tankGroup.remove(obj);
      interactiveObjects = interactiveObjects.filter(o => o !== obj);
      sceneItemsList = sceneItemsList.filter(item => item.id !== obj.userData?.id);
      if (interactiveObjects.length > 0) {
        selectTargetById(interactiveObjects[0].userData?.id);
      } else {
        selectedId = '';
        syncSlidersFromObject();
      }
    };

    duplicateSelectedObject = () => {
      const obj = getSelectedGroup();
      if (!obj) return;
      const clone = obj.clone(true);
      const newId = `clone_${Date.now()}`;
      clone.userData = { 
        ...obj.userData, 
        id: newId, 
        name: `${obj.userData.name} (Копия)` 
      };
      clone.position.x += 8;
      clone.position.z += 4;
      tankGroup.add(clone);
      interactiveObjects.push(clone);
      sceneItemsList = [...sceneItemsList, {
        id: newId,
        name: clone.userData.name,
        category: obj.userData.category || 'Хардскейп',
        specs: obj.userData.specs || '1 шт'
      }];
      selectTargetById(newId);
    };

    mirrorSelectedObject = () => {
      const obj = getSelectedGroup();
      if (!obj) return;
      obj.userData.isFlipped = !obj.userData.isFlipped;
      obj.scale.x *= -1;
      syncSlidersFromObject();
    };

    applyPlantGrowthEffect = () => {
      const growthFactor = plantGrowthDays === 1 ? 0.7 : (plantGrowthDays === 30 ? 1.0 : 1.4);
      interactiveObjects.forEach(obj => {
        if (obj.userData?.isPlant) {
          const baseScale = obj.userData.baseScale || 1.0;
          const userMult = obj.userData.scaleMultiplier || 1.0;
          const totalScale = baseScale * userMult * growthFactor;
          obj.scale.set(totalScale, totalScale, totalScale);
        }
      });
    };

    const textureLoader = new THREE.TextureLoader();

    function createCraggyStoneGeometry(roughnessVal: number): any {
      const geo = new THREE.DodecahedronGeometry(8, 1);
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const vx = pos.getX(i);
        const vy = pos.getY(i);
        const vz = pos.getZ(i);
        const factor = 1 + (Math.sin(vx * 2.1) * Math.cos(vy * 2.7) * Math.sin(vz * 3.1)) * roughnessVal;
        pos.setXYZ(i, vx * factor, vy * factor * 1.35, vz * factor * 0.85);
      }
      geo.computeVertexNormals();
      return geo;
    }

    addLibraryItem = (key: string) => {
      const wrapper = new THREE.Group();
      let name = 'Объект';
      let category = 'Хардскейп';
      let specs = '1 шт';
      let baseScale = 1.0;
      let isPlant = false;

      const spawnX = (Math.random() - 0.5) * 20;
      const spawnZ = (Math.random() - 0.5) * 12;
      const surfaceY = getSoilSurfaceY(spawnX, spawnZ);

      if (key === 'seiryu') {
        name = 'Скала Seiryu Stone';
        category = 'Хардскейп';
        specs = '~2.5 кг (Известняк)';
        const stoneGeo = createCraggyStoneGeometry(0.4);
        const stoneMat = new THREE.MeshStandardMaterial({ color: 0x5a6778, roughness: 0.9, flatShading: true });
        wrapper.add(new THREE.Mesh(stoneGeo, stoneMat));
        wrapper.position.set(spawnX, surfaceY + 4, spawnZ);
      } else if (key === 'dragon') {
        name = 'Камень Dragon Stone (Ohko)';
        category = 'Хардскейп';
        specs = '~1.8 кг (Сланец)';
        const stoneGeo = createCraggyStoneGeometry(0.5);
        const stoneMat = new THREE.MeshStandardMaterial({ color: 0xb46b28, roughness: 0.95, flatShading: true });
        wrapper.add(new THREE.Mesh(stoneGeo, stoneMat));
        wrapper.position.set(spawnX, surfaceY + 4, spawnZ);
      } else if (key === 'lava') {
        name = 'Вулканическая лава';
        category = 'Хардскейп';
        specs = '~1.2 кг (Базальт)';
        const stoneGeo = createCraggyStoneGeometry(0.6);
        const stoneMat = new THREE.MeshStandardMaterial({ color: 0x22242a, roughness: 0.95, flatShading: true });
        wrapper.add(new THREE.Mesh(stoneGeo, stoneMat));
        wrapper.position.set(spawnX, surfaceY + 4, spawnZ);
      } else if (key === 'mopani') {
        name = 'Коряга Мопани';
        category = 'Хардскейп';
        specs = '~3.0 кг (Корень)';
        const woodGeo = new THREE.CylinderGeometry(3.5, 5, 20, 16);
        wrapper.add(new THREE.Mesh(woodGeo, new THREE.MeshStandardMaterial({ color: 0x3f2212, roughness: 0.8 })));
        wrapper.rotation.z = Math.PI / 3;
        wrapper.position.set(spawnX, surfaceY + 3, spawnZ);
      } else if (key === 'monte-carlo') {
        name = 'Монте-Карло';
        category = 'Растения';
        specs = '1 меристема (in-vitro)';
        isPlant = true;
        const cGeo = new THREE.BoxGeometry(14, 1.2, 10);
        const cMat = new THREE.MeshStandardMaterial({ color: 0x4ade80, roughness: 0.9 });
        wrapper.add(new THREE.Mesh(cGeo, cMat));
        wrapper.position.set(spawnX, surfaceY, spawnZ);
      } else if (key === 'eleocharis') {
        name = 'Элеохарис мини';
        category = 'Растения';
        specs = '1 горшок';
        isPlant = true;
        const pTex = textureLoader.load('/assets/elements/plant_green.png');
        pTex.colorSpace = THREE.SRGBColorSpace;
        const pMat = new THREE.MeshStandardMaterial({ map: pTex, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide });
        for (let i = 0; i < 18; i++) {
          const grass = new THREE.Mesh(new THREE.PlaneGeometry(3, 7), pMat);
          grass.position.set((Math.random() - 0.5) * 8, 3.5, (Math.random() - 0.5) * 8);
          wrapper.add(grass);
        }
        wrapper.position.set(spawnX, surfaceY, spawnZ);
      } else if (key === 'anubias-nana') {
        name = 'Анубиас Нана';
        category = 'Растения';
        specs = '1 куст (на ризоме)';
        isPlant = true;
        const pTex = textureLoader.load('/assets/elements/plant_green.png');
        pTex.colorSpace = THREE.SRGBColorSpace;
        const pMat = new THREE.MeshStandardMaterial({ map: pTex, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide });
        for (let i = 0; i < 8; i++) {
          const leaf = new THREE.Mesh(new THREE.PlaneGeometry(6, 4.5), pMat);
          leaf.rotation.set((Math.random() - 0.5) * 0.5, (i / 8) * Math.PI * 2, 0.2);
          wrapper.add(leaf);
        }
        wrapper.position.set(spawnX, surfaceY + 6, spawnZ);
      } else if (key === 'buce') {
        name = 'Буцефаландра Deep Purple';
        category = 'Растения';
        specs = '1 точка роста';
        isPlant = true;
        const pTex = textureLoader.load('/assets/elements/plant_red.png');
        pTex.colorSpace = THREE.SRGBColorSpace;
        const pMat = new THREE.MeshStandardMaterial({ map: pTex, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide });
        for (let i = 0; i < 6; i++) {
          const leaf = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 3), pMat);
          leaf.rotation.set(0.2, (i / 6) * Math.PI * 2, 0);
          wrapper.add(leaf);
        }
        wrapper.position.set(spawnX, surfaceY + 3, spawnZ);
      } else if (key === 'rotala-green') {
        name = 'Ротала Green';
        category = 'Растения';
        specs = 'Пучок 20 веток';
        isPlant = true;
        const pTex = textureLoader.load('/assets/elements/plant_green.png');
        pTex.colorSpace = THREE.SRGBColorSpace;
        const pMat = new THREE.MeshStandardMaterial({ map: pTex, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide });
        for (let i = 0; i < 16; i++) {
          const stem = new THREE.Mesh(new THREE.PlaneGeometry(8, 22), pMat);
          stem.position.set((Math.random() - 0.5) * 7, 11, (Math.random() - 0.5) * 7);
          stem.rotation.y = Math.random() * Math.PI;
          wrapper.add(stem);
        }
        wrapper.position.set(spawnX, surfaceY, -depth * 0.3);
      } else if (key === 'rotala-hra') {
        name = 'Ротала H\'Ra';
        category = 'Растения';
        specs = 'Пучок 20 веток';
        isPlant = true;
        const pTex = textureLoader.load('/assets/elements/plant_red.png');
        pTex.colorSpace = THREE.SRGBColorSpace;
        const pMat = new THREE.MeshStandardMaterial({ map: pTex, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide });
        for (let i = 0; i < 16; i++) {
          const stem = new THREE.Mesh(new THREE.PlaneGeometry(8, 22), pMat);
          stem.position.set((Math.random() - 0.5) * 7, 11, (Math.random() - 0.5) * 7);
          stem.rotation.y = Math.random() * Math.PI;
          wrapper.add(stem);
        }
        wrapper.position.set(spawnX, surfaceY, -depth * 0.3);
      } else if (key === 'amphora') {
        name = 'Амфора / кувшин';
        category = 'Декор';
        specs = 'Керамика 18 см';
        const amphoraMat = new THREE.MeshStandardMaterial({ color: 0xba6a40, roughness: 0.85 });
        const body = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 4.2, 9, 20), amphoraMat);
        body.position.y = 4.5;
        wrapper.add(body);
        const neck = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.4, 4, 20), amphoraMat);
        neck.position.y = 10;
        wrapper.add(neck);
        wrapper.rotation.z = Math.PI / 4.5;
        wrapper.position.set(spawnX, surfaceY + 1.5, spawnZ);
      } else if (key === 'castle') {
        name = 'Каменный замок';
        category = 'Декор';
        specs = 'Полистоун 24 см';
        const stoneMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.9 });
        const roofMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.75 });
        [-4, 4].forEach(xOff => {
          const t = new THREE.Mesh(new THREE.CylinderGeometry(2, 2.3, 14, 16), stoneMat);
          t.position.set(xOff, 7, 0);
          wrapper.add(t);
          const r = new THREE.Mesh(new THREE.ConeGeometry(2.8, 5, 16), roofMat);
          r.position.set(xOff, 16.5, 0);
          wrapper.add(r);
        });
        const wall = new THREE.Mesh(new THREE.BoxGeometry(6, 10, 3), stoneMat);
        wall.position.set(0, 5, 0);
        wrapper.add(wall);
        wrapper.position.set(spawnX, surfaceY, spawnZ);
        baseScale = 0.9;
      }

      const newId = `asset_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      wrapper.userData = {
        id: newId,
        name: name,
        category: category,
        specs: specs,
        isPlant: isPlant,
        baseScale: baseScale,
        scaleMultiplier: 1.0,
        isFlipped: false
      };

      tankGroup.add(wrapper);
      interactiveObjects.push(wrapper);

      sceneItemsList = [...sceneItemsList, {
        id: newId,
        name: name,
        category: category,
        specs: specs
      }];

      selectTargetById(newId);
    };

    
            takePhotoSnapshot = () => {
      try {
        if (!renderer || !scene || !camera) return;
        
        // Скрываем маркер выделения перед снимком
        if (typeof selectionRing !== "undefined") selectionRing.visible = false;

        const origW = renderer.domElement.width;
        const origH = renderer.domElement.height;
        const origAspect = camera.aspect;

        // Рендерим в честном 4K UHD разрешении (3840x2160)
        const targetW = 3840;
        const targetH = 2160;
        
        camera.aspect = targetW / targetH;
        camera.updateProjectionMatrix();
        renderer.setSize(targetW, targetH, false);

        renderer.render(scene, camera);

        const dataUrl = renderer.domElement.toDataURL("image/jpeg", 0.98);
        const link = document.createElement("a");
        link.download = "aquascape_studio_4K_" + Date.now() + ".jpg";
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        setTimeout(() => document.body.removeChild(link), 500);

        // Возвращаем исходные размеры вьюпорта
        camera.aspect = origAspect;
        camera.updateProjectionMatrix();
        renderer.setSize(containerElement!.clientWidth, containerElement!.clientHeight, false);
        renderer.render(scene, camera);
      } catch (err) {
        console.error("4K Snapshot error:", err);
      } finally {
        if (typeof selectionRing !== "undefined" && selectedId) selectionRing.visible = true;
      }
    };

    exportLayoutJson = () => {
      const data = {
        tank: { tankType, length, depth, height, radius, frontLayerCm, backLayerCm, bgTheme, lightMode },
        items: interactiveObjects.map(o => ({
          name: o.userData.name,
          url: o.userData.modelUrl,
          baseScale: o.userData.baseScale,
          scaleMultiplier: o.userData.scaleMultiplier,
          pos: [o.position.x, o.position.y, o.position.z],
          rot: [o.rotation.x, o.rotation.y, o.rotation.z]
        }))
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `aquascape_layout_${Date.now()}.json`;
      a.click();
    };

    importLayoutJson = (jsonStr: string) => {
      try {
        const data = JSON.parse(jsonStr);
        if (data.tank) {
          tankType = data.tank.tankType || tankType;
          length = data.tank.length || length;
          depth = data.tank.depth || depth;
          height = data.tank.height || height;
          radius = data.tank.radius || radius;
          frontLayerCm = data.tank.frontLayerCm || frontLayerCm;
          backLayerCm = data.tank.backLayerCm || backLayerCm;
          bgTheme = data.tank.bgTheme || bgTheme;
          lightMode = data.tank.lightMode || lightMode;
          updateBackdropScreen();
          updateLightingMode();
          rebuildGeometry();
        }
        if (data.items && Array.isArray(data.items)) {
          for (const item of data.items) {
            if (item.url) loadGlbIntoScene(item.url, item.name, 35);
          }
        }
      } catch (e: any) {
        alert('Ошибка чтения JSON: ' + e.message);
      }
    };

        const gltfLoader = new GLTFLoader();

    loadGlbIntoScene = (url: string, name: string, targetSizeCm?: number, customId?: string) => {
      gltfLoader.load(
        url,
        (gltf: any) => {
          const model = gltf.scene;

          model.traverse((child: any) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
              child.renderOrder = 5;
              if (child.material) {
                child.material.roughness = Math.max(child.material.roughness, 0.75);
                child.material.metalness = Math.min(child.material.metalness, 0.15);
                child.material.needsUpdate = true;
              }
            }
          });

          const box = new THREE.Box3().setFromObject(model);
          const size = new THREE.Vector3();
          box.getSize(size);
          const center = new THREE.Vector3();
          box.getCenter(center);
          model.position.sub(center);

          const wrapper = new THREE.Group();
          wrapper.add(model);

          const maxDim = Math.max(size.x, size.y, size.z) || 1;
          const desiredCm = targetSizeCm || 35;
          const baseScale = desiredCm / maxDim;

          wrapper.scale.set(baseScale, baseScale, baseScale);
          wrapper.position.set(0, getSoilSurfaceY(0, 0) + 2, 0);

          const newId = customId || `glb_${Date.now()}`;
          wrapper.userData = { 
            id: newId, 
            name: name, 
            category: 'Хардскейп',
            specs: 'Ветвистая коряга',
            modelUrl: url,
            baseScale: baseScale,
            scaleMultiplier: 1.0,
            isFlipped: false
          };

          tankGroup.add(wrapper);
          interactiveObjects.push(wrapper);

          sceneItemsList = [...sceneItemsList, {
            id: newId,
            name: name,
            category: 'Хардскейп',
            specs: 'Ветвистая коряга 36 см'
          }];

          selectTargetById(newId);
        },
        undefined,
        (err: any) => console.error(err)
      );
    };

    loadGlbIntoScene('/models/driftwood_latest.glb', 'Коряга Spider Wood', 36);
    addLibraryItem('seiryu');
    addLibraryItem('rotala-green');
    addLibraryItem('rotala-hra');

    const fishTex = textureLoader.load('/assets/elements/fish_neon.png');
    fishTex.colorSpace = THREE.SRGBColorSpace;
    const fishMat = new THREE.MeshStandardMaterial({ map: fishTex, transparent: true, alphaTest: 0.25, depthWrite: true, side: THREE.DoubleSide });
    const fishGroup = new THREE.Group();
    fishGroup.renderOrder = 2;
    tankGroup.add(fishGroup);

    const fishObjects: any[] = [];
    for (let i = 0; i < 14; i++) {
      const f = new THREE.Mesh(new THREE.PlaneGeometry(5, 2.5), fishMat);
      f.castShadow = true;
      f.renderOrder = 2;
      fishObjects.push({
        mesh: f,
        speed: 0.015 + Math.random() * 0.01,
        angle: Math.random() * Math.PI * 2,
        r: 12 + Math.random() * 26,
        y: 2 + Math.random() * 16
      });
      fishGroup.add(f);
    }

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersectPoint = new THREE.Vector3();
    const dragOffset = new THREE.Vector3();
    let isDraggingXZ = false;
    let isDraggingY = false;
    let startScreenY = 0;
    let initialObjY = 0;

    const onPointerDown = (e: MouseEvent) => {
      if (actionMode === 'orbit') return;
      const rect = containerElement!.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(interactiveObjects, true);

      if (hits.length > 0) {
        // Находим именно тот объект, который зарегистрирован в interactiveObjects
        let matchedObj: any = null;
        for (const hit of hits) {
          let curr: any = hit.object;
          while (curr && curr !== tankGroup) {
            if (interactiveObjects.includes(curr)) {
              matchedObj = curr;
              break;
            }
            curr = curr.parent;
          }
          if (matchedObj) break;
        }
        if (matchedObj && matchedObj.userData?.id) {
          selectTargetById(matchedObj.userData.id);
        }

        orbit.enabled = false;
        const currentObj = getSelectedGroup();
        if (e.button === 2 || e.shiftKey) {
          isDraggingY = true;
          startScreenY = e.clientY;
          initialObjY = currentObj.position.y;
        } else if (e.button === 0) {
          isDraggingXZ = true;
          dragPlane.constant = -currentObj.position.y;
          if (raycaster.ray.intersectPlane(dragPlane, intersectPoint)) {
            dragOffset.copy(currentObj.position).sub(intersectPoint);
          }
        }
      }
    };

    const onPointerMove = (e: MouseEvent) => {
      const currentObj = getSelectedGroup();
      if (!currentObj) return;

      if (isDraggingY) {
        currentObj.position.y = initialObjY + (startScreenY - e.clientY) * 0.35;
        syncSlidersFromObject();
      } else if (isDraggingXZ) {
        const rect = containerElement!.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        if (raycaster.ray.intersectPlane(dragPlane, intersectPoint)) {
          const np = intersectPoint.add(dragOffset);
          currentObj.position.x = np.x;
          currentObj.position.z = np.z;

          const sY = getSoilSurfaceY(np.x, np.z);
          currentObj.position.y = Math.max(sY, currentObj.position.y);

          syncSlidersFromObject();
        }
      }
    };

    const onPointerUp = () => {
      isDraggingXZ = false;
      isDraggingY = false;
      orbit.enabled = true;
    };

    containerElement.addEventListener('mousedown', onPointerDown);
    containerElement.addEventListener('contextmenu', e => e.preventDefault());
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);

    const onResize = () => {
      if (!containerElement) return;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize);

    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      const elapsed = clock.getElapsedTime();
      orbit.update();

      if (isCinematicTour) {
        camera.position.x = Math.sin(elapsed * 0.15) * 140;
        camera.position.z = Math.cos(elapsed * 0.15) * 140;
        camera.position.y = 24 + Math.sin(elapsed * 0.3) * 6;
        camera.lookAt(0, -2, 0);
      }

      if (showFish && !isTopDownView) {
        fishGroup.visible = true;
        for (const f of fishObjects) {
          f.angle += f.speed;
          f.mesh.position.x = Math.cos(f.angle) * f.r;
          f.mesh.position.z = Math.sin(f.angle) * (f.r * 0.55);
          f.mesh.position.y = f.y + Math.sin(elapsed * 2.5 + f.angle) * 1.2;
          f.mesh.rotation.y = -f.angle + Math.PI / 2;
        }
      } else {
        fishGroup.visible = false;
      }

      renderer.render(scene, camera);
      animId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      orbit.dispose();
      renderer.dispose();
    };
  });

  $effect(() => {
    if (tankType || length || depth || height || radius || frontLayerCm || backLayerCm) {
      rebuildGeometry();
    }
  });

  // --- ГЛОБАЛЬНЫЙ ДЕЛЕГИРОВАННЫЙ DRAG ДЛЯ ВСЕХ ПАНЕЛЕЙ ---
  $effect(() => {
    let activeEl: HTMLElement | null = null;
    let startX = 0, startY = 0;
    let initialLeft = 0, initialTop = 0;

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;

      // Игнорируем клики по кнопкам, ползункам, инпутам и скролл-списку
      if (target.closest("button, input, select, textarea, .range-slider, .left-cards-scroll, a")) return;

      // Ищем ближайшую панель
      const panel = target.closest(".center-mode-bar, .left-library-drawer, .right-inspector-panel") as HTMLElement;
      if (!panel) return;

      activeEl = panel;
      activeEl.style.userSelect = "none";
      const rect = activeEl.getBoundingClientRect();

      // Фиксируем координаты и убираем мешающие css-свойства
      activeEl.style.position = "fixed";
      activeEl.style.right = "auto";
      activeEl.style.bottom = "auto";
      activeEl.style.setProperty("transform", "none", "important"); activeEl.style.bottom = "auto";
      activeEl.style.left = rect.left + "px";
      activeEl.style.top = rect.top + "px";
      activeEl.style.zIndex = "100";

      startX = e.clientX;
      startY = e.clientY;
      initialLeft = rect.left;
      initialTop = rect.top;

      try {
        activeEl.setPointerCapture(e.pointerId);
      } catch (_) {}
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!activeEl) return;
      e.preventDefault();
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      activeEl.style.setProperty("left", (initialLeft + dx) + "px", "important");
      activeEl.style.setProperty("top", (initialTop + dy) + "px", "important");
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!activeEl) return;
      try {
        activeEl.releasePointerCapture(e.pointerId);
      } catch (_) {}
      activeEl = null;
    };

    window.addEventListener("pointerdown", onPointerDown, { capture: true });
    window.addEventListener("pointermove", onPointerMove, { capture: true });
    window.addEventListener("pointerup", onPointerUp, { capture: true });
    window.addEventListener("pointercancel", onPointerUp, { capture: true });

    return () => {
      window.removeEventListener("pointerdown", onPointerDown, { capture: true });
      window.removeEventListener("pointermove", onPointerMove, { capture: true });
      window.removeEventListener("pointerup", onPointerUp, { capture: true });
      window.removeEventListener("pointercancel", onPointerUp, { capture: true });
    };
  });

</script>

<input type="file" accept=".glb,.gltf" bind:this={fileInputDom} onchange={(e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) loadGlbIntoScene(URL.createObjectURL(file), file.name.replace(/\.[^/.]+$/, ""));
}} style="display: none;" />

<input type="file" accept=".json" bind:this={jsonInputDom} onchange={(e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (ev) => importLayoutJson(ev.target?.result as string);
    reader.readAsText(file);
  }
}} style="display: none;" />

<input type="file" accept="image/*" bind:this={photoInputDom} onchange={handlePhotoSelected} style="display: none;" />

<div class="fullscreen-viewport">
  <div bind:this={containerElement} class="canvas-layer"></div>

  {#if showGridRule}
    <div class="golden-ratio-overlay">
      <div class="grid-line grid-v-1"></div>
      <div class="grid-line grid-v-2"></div>
      <div class="grid-line grid-h-1"></div>
      <div class="grid-line grid-h-2"></div>
      <div class="grid-focal f-top-left"></div>
      <div class="grid-focal f-top-right"></div>
      <div class="grid-focal f-bottom-left"></div>
      <div class="grid-focal f-bottom-right"></div>
    </div>
  {/if}

  <!-- ВЕРХНИЙ WIZARD HEADER -->
  <header class="wizard-header">
    <div class="brand">
      <div class="logo-box">
        <Box class="w-4 h-4 text-sky-400" />
      </div>
      <span class="brand-title">ScapeCraft</span>
    </div>

    <div class="step-switcher">
      <button onclick={() => currentStep = 1} class="step-btn {currentStep === 1 ? 'step-btn-active' : ''}">
        <span class="step-num">1</span>
        <span>Банка & Грунт</span>
      </button>

      <button onclick={() => currentStep = 2} class="step-btn {currentStep === 2 ? 'step-btn-active' : ''}">
        <span class="step-num">2</span>
        <span>Конструктор (Наполнение)</span>
      </button>

      <button onclick={() => currentStep = 3} class="step-btn {currentStep === 3 ? 'step-btn-active' : ''}">
        <span class="step-num">3</span>
        <span>Визуал & Смета</span>
      </button>
    </div>

    <!-- Быстрые действия -->
    <div class="flex items-center gap-1.5">
      <button onclick={exportLayoutJson} class="btn-top-glass" title="Сохранить проект в JSON"><Save class="w-3.5 h-3.5 text-emerald-400" /></button>
      <button onclick={() => jsonInputDom?.click()} class="btn-top-glass" title="Открыть проект"><FolderOpen class="w-3.5 h-3.5 text-amber-400" /></button>
      <button onclick={() => resetCameraFn?.()} class="btn-top-glass" title="Сброс камеры"><RotateCcw class="w-3.5 h-3.5 text-slate-300" /></button>
      <button onclick={() => takePhotoSnapshot?.()} class="btn-top-glass text-sky-400 hover:text-sky-300" title="Сделать снимок 4K"><Download class="w-3.5 h-3.5" /></button>
    </div>
  </header>

  <!-- ========================================================================= -->
  <!-- ШАГ 1: ГЕОМЕТРИЯ БАНКИ И ГРУНТ                                            -->
  <!-- ========================================================================= -->
  {#if currentStep === 1}
    <div class="step-panel-left animate-fade-in">
      <div class="panel-section">
        <div class="panel-title"><Box class="w-3.5 h-3.5 text-sky-400" /> Форма аквариума</div>
        <div class="grid grid-cols-3 gap-1 mt-2">
          <button onclick={() => tankType = 'rect'} class="shape-btn {tankType === 'rect' ? 'shape-btn-active' : ''}">Прямоуг.</button>
          <button onclick={() => tankType = 'cube'} class="shape-btn {tankType === 'cube' ? 'shape-btn-active' : ''}">Куб</button>
          <button onclick={() => tankType = 'bow'} class="shape-btn {tankType === 'bow' ? 'shape-btn-active' : ''}">Панорама</button>
          <button onclick={() => tankType = 'cylinder'} class="shape-btn {tankType === 'cylinder' ? 'shape-btn-active' : ''}">Цилиндр</button>
          <button onclick={() => tankType = 'sphere'} class="shape-btn {tankType === 'sphere' ? 'shape-btn-active' : ''}">Шар / Сфера</button>
        </div>

        <div class="flex flex-col gap-2 mt-3">
          {#if tankType === 'cylinder' || tankType === 'sphere'}
            <div class="slider-row">
              <span class="text-[11px] text-slate-300">Диаметр</span>
              <input type="range" min="15" max="50" step="1" bind:value={radius} oninput={rebuildGeometry} class="range-slider range-sky w-28" />
              <span class="font-mono text-[10px] text-sky-400">{radius * 2} см</span>
            </div>
            {#if tankType === 'cylinder'}
              <div class="slider-row">
                <span class="text-[11px] text-slate-300">Высота</span>
                <input type="range" min="20" max="80" step="2" bind:value={height} oninput={rebuildGeometry} class="range-slider range-sky w-28" />
                <span class="font-mono text-[10px] text-sky-400">{height} см</span>
              </div>
            {/if}
          {:else}
            <div class="slider-row">
              <span class="text-[11px] text-slate-300">Длина</span>
              <input type="range" min="30" max="200" step="5" bind:value={length} oninput={rebuildGeometry} class="range-slider range-sky w-28" />
              <span class="font-mono text-[10px] text-sky-400">{length} см</span>
            </div>
            <div class="slider-row">
              <span class="text-[11px] text-slate-300">Глубина</span>
              <input type="range" min="20" max="80" step="5" bind:value={depth} oninput={rebuildGeometry} class="range-slider range-sky w-28" />
              <span class="font-mono text-[10px] text-sky-400">{depth} см</span>
            </div>
            <div class="slider-row">
              <span class="text-[11px] text-slate-300">Высота</span>
              <input type="range" min="20" max="80" step="5" bind:value={height} oninput={rebuildGeometry} class="range-slider range-sky w-28" />
              <span class="font-mono text-[10px] text-sky-400">{height} см</span>
            </div>
          {/if}
        </div>
      </div>

      <div class="panel-section">
        <div class="panel-title"><Layers class="w-3.5 h-3.5 text-emerald-400" /> Уклон грунта</div>
        <div class="flex flex-col gap-2 mt-2">
          <div class="slider-row">
            <span class="text-[11px] text-slate-300">Спереди (бортик)</span>
            <input type="range" min="2" max="10" bind:value={frontLayerCm} oninput={rebuildGeometry} class="range-slider range-emerald w-28" />
            <span class="font-mono text-[10px] text-emerald-400">{frontLayerCm} см</span>
          </div>
          <div class="slider-row">
            <span class="text-[11px] text-slate-300">Сзади (горка)</span>
            <input type="range" min="4" max="25" bind:value={backLayerCm} oninput={rebuildGeometry} class="range-slider range-emerald w-28" />
            <span class="font-mono text-[10px] text-emerald-400">{backLayerCm} см</span>
          </div>
        </div>
      </div>

      <div class="panel-section bg-slate-900/60 p-2.5 rounded-xl border border-white/5">
        <div class="flex justify-between text-xs">
          <span class="text-slate-400">Объем брутто:</span>
          <span class="font-mono font-bold text-sky-400">~{grossVolumeLiters} л</span>
        </div>
        <div class="flex justify-between text-xs mt-1">
          <span class="text-slate-400">Расход сойла:</span>
          <span class="font-mono font-bold text-emerald-400">~{substrateVolumeLiters} л ({Math.ceil(substrateVolumeLiters / 9)} пак.)</span>
        </div>
      </div>

      <button onclick={() => currentStep = 2} class="btn-next-step">
        <span>Перейти к наполнению</span>
        <ChevronRight class="w-4 h-4" />
      </button>
    </div>
  {/if}

  <!-- ========================================================================= -->
  <!-- ШАГ 2: КОНСТРУКТОР (ЛЕВАЯ БИБЛИОТЕКА + ПРАВЫЙ ИНСПЕКТОР)                   -->
  <!-- ========================================================================= -->
  {#if currentStep === 2}
    <!-- Тулбар режимов манипулятора по центру вверху -->
    <div use:makeDraggable use:makeDraggable class="center-mode-bar select-none cursor-move select-none cursor-move animate-fade-in">
      <div class="segmented-control">
        <button onclick={() => actionMode = 'drag'} class="seg-btn {actionMode === 'drag' ? 'seg-active-drag' : ''}">
          <Move3d class="w-3.5 h-3.5" />
          <span>Перемещение</span>
        </button>
        <button onclick={() => actionMode = 'orbit'} class="seg-btn {actionMode === 'orbit' ? 'seg-active-orbit' : ''}">
          <Camera class="w-3.5 h-3.5" />
          <span>Камера</span>
        </button>
      </div>

      <button onclick={() => isAiModalOpen = true} class="btn-ai-header">
        <Wand2 class="w-3.5 h-3.5" />
        <span>Создать 3D по фото</span>
      </button>

      <button onclick={() => fileInputDom?.click()} class="btn-upload-header" title="Загрузить свой .glb">
        <Upload class="w-3.5 h-3.5 text-sky-400" />
        <span>.glb</span>
      </button>
    </div>

    <!-- ЛЕВАЯ ПАНЕЛЬ: БИБЛИОТЕКА АССЕТОВ (НЕ ПЕРЕКРЫВАЕТ НИЧЕГО!) -->
    <div use:makeDraggable use:makeDraggable class="left-library-drawer select-none select-none animate-fade-in">
      <div class="dock-header">
        <span class="font-bold text-xs text-white uppercase tracking-wider">Каталог моделей</span>
      </div>

      <div class="lib-category-tabs">
        <button onclick={() => activeLibCategory = 'plants'} class="lib-cat-btn {activeLibCategory === 'plants' ? 'lib-cat-active' : ''}">
          Флора
        </button>
        <button onclick={() => activeLibCategory = 'hardscape'} class="lib-cat-btn {activeLibCategory === 'hardscape' ? 'lib-cat-active' : ''}">
          Хардскейп
        </button>
        <button onclick={() => activeLibCategory = 'decor'} class="lib-cat-btn {activeLibCategory === 'decor' ? 'lib-cat-active' : ''}">
          Декор
        </button>
      </div>

      <div class="left-cards-scroll">
        {#if activeLibCategory === 'plants'}
          <button onclick={() => addLibraryItem('rotala-green')} class="asset-card-row">
            <div class="asset-icon bg-emerald-950/40 text-emerald-400"><Trees class="w-4 h-4" /></div>
            <div class="flex flex-col text-left"><span class="card-name">Ротала Green</span><span class="card-sub">Задний план</span></div>
            <Plus class="w-3.5 h-3.5 text-emerald-400 ml-auto" />
          </button>
          <button onclick={() => addLibraryItem('rotala-hra')} class="asset-card-row">
            <div class="asset-icon bg-rose-950/40 text-rose-400"><Trees class="w-4 h-4" /></div>
            <div class="flex flex-col text-left"><span class="card-name">Ротала H'Ra</span><span class="card-sub">Красная</span></div>
            <Plus class="w-3.5 h-3.5 text-emerald-400 ml-auto" />
          </button>
          <button onclick={() => addLibraryItem('anubias-nana')} class="asset-card-row">
            <div class="asset-icon bg-emerald-950/40 text-emerald-300"><Trees class="w-4 h-4" /></div>
            <div class="flex flex-col text-left"><span class="card-name">Анубиас Нана</span><span class="card-sub">На корягу</span></div>
            <Plus class="w-3.5 h-3.5 text-emerald-400 ml-auto" />
          </button>
          <button onclick={() => addLibraryItem('buce')} class="asset-card-row">
            <div class="asset-icon bg-purple-950/40 text-purple-400"><Trees class="w-4 h-4" /></div>
            <div class="flex flex-col text-left"><span class="card-name">Буцефаландра</span><span class="card-sub">Фиолетовая</span></div>
            <Plus class="w-3.5 h-3.5 text-emerald-400 ml-auto" />
          </button>
          <button onclick={() => addLibraryItem('monte-carlo')} class="asset-card-row">
            <div class="asset-icon bg-green-950/40 text-green-400"><LandPlot class="w-4 h-4" /></div>
            <div class="flex flex-col text-left"><span class="card-name">Монте-Карло</span><span class="card-sub">Ковер</span></div>
            <Plus class="w-3.5 h-3.5 text-emerald-400 ml-auto" />
          </button>
          <button onclick={() => addLibraryItem('eleocharis')} class="asset-card-row">
            <div class="asset-icon bg-lime-950/40 text-lime-400"><Trees class="w-4 h-4" /></div>
            <div class="flex flex-col text-left"><span class="card-name">Элеохарис</span><span class="card-sub">Травка</span></div>
            <Plus class="w-3.5 h-3.5 text-emerald-400 ml-auto" />
          </button>

        {:else if activeLibCategory === 'hardscape'}
          <button onclick={() => loadGlbIntoScene('/models/driftwood_latest.glb', 'Коряга Spider Wood', 36)} class="asset-card-row">
            <div class="asset-icon bg-amber-950/40 text-amber-500"><Trees class="w-4 h-4" /></div>
            <div class="flex flex-col text-left"><span class="card-name">Spider Wood</span><span class="card-sub">Ветвистый корень</span></div>
            <Plus class="w-3.5 h-3.5 text-emerald-400 ml-auto" />
          </button>
          <button onclick={() => addLibraryItem('seiryu')} class="asset-card-row">
            <div class="asset-icon bg-slate-800 text-slate-300"><Sparkles class="w-4 h-4" /></div>
            <div class="flex flex-col text-left"><span class="card-name">Seiryu Stone</span><span class="card-sub">Скала</span></div>
            <Plus class="w-3.5 h-3.5 text-emerald-400 ml-auto" />
          </button>
          <button onclick={() => addLibraryItem('dragon')} class="asset-card-row">
            <div class="asset-icon bg-amber-900 text-amber-400"><Sparkles class="w-4 h-4" /></div>
            <div class="flex flex-col text-left"><span class="card-name">Dragon Stone</span><span class="card-sub">Сланец</span></div>
            <Plus class="w-3.5 h-3.5 text-emerald-400 ml-auto" />
          </button>
          <button onclick={() => addLibraryItem('lava')} class="asset-card-row">
            <div class="asset-icon bg-zinc-900 text-zinc-400"><Sparkles class="w-4 h-4" /></div>
            <div class="flex flex-col text-left"><span class="card-name">Вулкан. лава</span><span class="card-sub">Базальт</span></div>
            <Plus class="w-3.5 h-3.5 text-emerald-400 ml-auto" />
          </button>
          <button onclick={() => addLibraryItem('mopani')} class="asset-card-row">
            <div class="asset-icon bg-stone-900 text-amber-600"><Trees class="w-4 h-4" /></div>
            <div class="flex flex-col text-left"><span class="card-name">Мопани</span><span class="card-sub">Тяжелое дерево</span></div>
            <Plus class="w-3.5 h-3.5 text-emerald-400 ml-auto" />
          </button>

        {:else if activeLibCategory === 'decor'}
          <button onclick={() => addLibraryItem('amphora')} class="asset-card-row">
            <div class="asset-icon bg-orange-950/40 text-orange-400"><LandPlot class="w-4 h-4" /></div>
            <div class="flex flex-col text-left"><span class="card-name">Амфора</span><span class="card-sub">Кувшин в грунте</span></div>
            <Plus class="w-3.5 h-3.5 text-emerald-400 ml-auto" />
          </button>
          <button onclick={() => addLibraryItem('castle')} class="asset-card-row">
            <div class="asset-icon bg-red-950/40 text-red-400"><Castle class="w-4 h-4" /></div>
            <div class="flex flex-col text-left"><span class="card-name">Замок</span><span class="card-sub">С арками</span></div>
            <Plus class="w-3.5 h-3.5 text-emerald-400 ml-auto" />
          </button>
        {/if}
      </div>
    </div>

    <!-- ПРАВАЯ ПАНЕЛЬ: ИНСПЕКТОР ОБЪЕКТА -->
    <div use:makeDraggable use:makeDraggable class="right-inspector-panel select-none select-none animate-fade-in" style="">
      <div class="panel-section">
        <div class="flex items-center justify-between">
          <div class="panel-title truncate"><Trees class="w-3.5 h-3.5 text-sky-400 flex-shrink-0" /> {selectedLabel}</div>
          <div class="flex items-center gap-1 flex-shrink-0">
            <button onclick={duplicateSelectedObject} class="action-btn text-sky-400" title="Дублировать"><Copy class="w-3.5 h-3.5" /></button>
            <button onclick={mirrorSelectedObject} class="action-btn text-amber-400" title="Отразить (Flip X)"><FlipHorizontal class="w-3.5 h-3.5" /></button>
            <button onclick={deleteSelectedObject} class="action-btn text-red-400" title="Удалить"><Trash2 class="w-3.5 h-3.5" /></button>
          </div>
        </div>
      </div>

      <div class="panel-section">
        <div class="panel-title"><Rotate3d class="w-3.5 h-3.5 text-amber-400" /> Вращение в 3D</div>
        <div class="flex flex-col gap-2 mt-2">
          <div class="slider-row">
            <span class="text-[11px] text-slate-300">Поворот (Y)</span>
            <input type="range" min="-180" max="180" step="1" bind:value={rotY} oninput={updateTransformFromSliders} class="range-slider range-amber w-28" />
            <span class="font-mono text-[10px] text-amber-400">{rotY}°</span>
          </div>
          <div class="slider-row">
            <span class="text-[11px] text-slate-300">Наклон (X)</span>
            <input type="range" min="-180" max="180" step="1" bind:value={rotX} oninput={updateTransformFromSliders} class="range-slider range-amber w-28" />
            <span class="font-mono text-[10px] text-amber-400">{rotX}°</span>
          </div>
        </div>
      </div>

      <div class="panel-section">
        <div class="panel-title"><Sliders class="w-3.5 h-3.5 text-sky-400" /> Высота и масштаб</div>
        <div class="flex flex-col gap-2 mt-2">
          <div class="slider-row">
            <span class="text-[11px] text-slate-300">Высота (Y)</span>
            <input type="range" min="-30" max="30" step="0.2" bind:value={posY} oninput={updateTransformFromSliders} class="range-slider range-emerald w-28" />
            <span class="font-mono text-[10px] text-emerald-400">{posY.toFixed(1)} см</span>
          </div>
          <div class="slider-row">
            <span class="text-[11px] text-slate-300">Масштаб</span>
            <input type="range" min="0.4" max="3.0" step="0.05" bind:value={scaleMultiplier} oninput={updateTransformFromSliders} class="range-slider range-sky w-28" />
            <span class="font-mono text-[10px] text-sky-400">{(scaleMultiplier * 100).toFixed(0)}%</span>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- ========================================================================= -->
  <!-- ШАГ 3: ВИЗУАЛ, ТАЙМЛАПС И ТЕХНИЧЕСКИЙ ПАСПОРТ                             -->
  <!-- ========================================================================= -->
  {#if currentStep === 3}
    <div class="step3-bottom-bar animate-fade-in">
      <div class="flex items-center gap-2 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-white/10">
        <Clock class="w-3.5 h-3.5 text-emerald-400" />
        <span class="text-xs font-bold text-slate-200">Рост:</span>
        <div class="flex gap-1">
          <button onclick={() => { plantGrowthDays = 1; applyPlantGrowthEffect(); }} class="pill-btn {plantGrowthDays === 1 ? 'pill-active' : ''}">День 1</button>
          <button onclick={() => { plantGrowthDays = 30; applyPlantGrowthEffect(); }} class="pill-btn {plantGrowthDays === 30 ? 'pill-active' : ''}">День 30</button>
          <button onclick={() => { plantGrowthDays = 90; applyPlantGrowthEffect(); }} class="pill-btn {plantGrowthDays === 90 ? 'pill-active' : ''}">День 90</button>
        </div>
      </div>

      <button onclick={toggleTopDownCameraFn} class="btn-step3 {isTopDownView ? 'btn-active-tour' : ''}">
        <Compass class="w-4 h-4" />
        <span>{isTopDownView ? '3D Вид' : '2D Схема (Сверху)'}</span>
      </button>

      <button onclick={() => showGridRule = !showGridRule} class="btn-step3 {showGridRule ? 'btn-active-gold' : ''}">
        <Grid class="w-4 h-4" />
        <span>Сетка третей</span>
      </button>

      <div class="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-white/10">
        <button onclick={() => { lightMode = 'day'; updateLightingMode(); }} class="p-1.5 rounded {lightMode === 'day' ? 'bg-amber-500/20 text-amber-300' : 'text-slate-400'}"><Sun class="w-3.5 h-3.5" /></button>
        <button onclick={() => { lightMode = 'sunset'; updateLightingMode(); }} class="p-1.5 rounded {lightMode === 'sunset' ? 'bg-orange-500/20 text-orange-400' : 'text-slate-400'}"><Sunset class="w-3.5 h-3.5" /></button>
        <button onclick={() => { lightMode = 'moon'; updateLightingMode(); }} class="p-1.5 rounded {lightMode === 'moon' ? 'bg-blue-500/20 text-blue-300' : 'text-slate-400'}"><Moon class="w-3.5 h-3.5" /></button>
      </div>

      <select bind:value={bgTheme} onchange={() => updateBackdropScreen()} class="bg-slate-900/90 text-xs font-bold text-slate-200 border border-white/10 rounded-xl px-2.5 py-2 outline-none cursor-pointer">
        <option value="ada-sky">Фон: ADA Light</option>
        <option value="deep-ocean">Фон: Океан</option>
        <option value="mist-white">Фон: Белый</option>
        <option value="dark-nature">Фон: Тёмный</option>
      </select>

      <button onclick={() => isCinematicTour = !isCinematicTour} class="btn-step3 {isCinematicTour ? 'btn-active-tour' : ''}">
        {#if isCinematicTour}<Pause class="w-4 h-4 text-amber-400" /><span>Стоп</span>{:else}<Play class="w-4 h-4 text-sky-400" /><span>Тур 360°</span>{/if}
      </button>

      <button onclick={() => isPassportOpen = true} class="btn-step3-passport">
        <Printer class="w-4 h-4 text-emerald-300" />
        <span>Паспорт</span>
      </button>

      <button onclick={generateAiAquascape} class="px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 bg-gradient-to-r from-purple-600 via-indigo-600 to-sky-500 hover:from-purple-500 hover:to-sky-400 text-white shadow-lg shadow-indigo-950/40 transition-all border border-indigo-400/30 cursor-pointer">
        <Sparkles class="w-4 h-4 text-amber-300 animate-pulse" />
        <span>ИИ Фотореализм</span>
      </button>

      <button onclick={takePhotoSnapshot}  class="btn-step3-snapshot">
        <Download class="w-4 h-4" />
        <span>{isRendering4K ? '...' : 'Фото 4K'}</span>
      </button>
    </div>
  {/if}

  
  <!-- МОДАЛЬНОЕ ОКНО ИИ ФОТОРЕАЛИЗМА -->
  {#if isAiRenderOpen}
    <div class="modal-backdrop" onclick={(e) => { if (e.target === e.currentTarget && !aiEnhancing) isAiRenderOpen = false; }}>
      <div class="modal-box animate-fade-in">
        
        <!-- Заголовок -->
        <div class="flex items-center justify-between pb-2 border-b border-white/10 shrink-0">
          <div class="flex items-center gap-2">
            <Sparkles class="w-5 h-5 text-indigo-400" />
            <h3 class="text-base font-bold text-white">Студийный Фоторендер ADA</h3>
          </div>
          <button onclick={() => isAiRenderOpen = false} disabled={aiEnhancing} class="text-slate-400 hover:text-white p-1 rounded-lg">
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Контент и фото -->
        <div class="modal-image-container">
          {#if aiEnhancing}
            <div class="flex flex-col items-center gap-3 p-8 text-center">
              <Loader2 class="w-10 h-10 text-indigo-400 animate-spin" />
              <p class="text-sm font-semibold text-slate-200 animate-pulse">Генерация фотореалистичного акваскейпа...</p>
              <p class="text-xs text-slate-400 max-w-sm">Сохраняем геометрию коряг, камней и растений (15-25 сек)</p>
            </div>
          {:else if aiErrorMessage}
            <div class="flex flex-col items-center gap-2 text-center p-6 text-red-400">
              <p class="font-bold text-sm">Произошла ошибка</p>
              <p class="text-xs text-slate-300 max-w-md">{aiErrorMessage}</p>
              <button onclick={generateAiAquascape} class="mt-3 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white">
                Попробовать снова
              </button>
            </div>
          {:else if aiEnhancedImage}
            <img src={aiEnhancedImage} alt="AI Aquascape" />
          {/if}
        </div>

        <!-- Нижняя панель с кнопками (Всегда видна!) -->
        {#if aiEnhancedImage && !aiEnhancing}
          <div class="pt-3 border-t border-white/10 flex items-center justify-between shrink-0 gap-3">
            <span class="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
              <Check class="w-4 h-4" /> Фотореалистичный акваскейп готов
            </span>
            <div class="flex items-center gap-2">
              <button onclick={() => isAiRenderOpen = false} class="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-medium">
                Закрыть
              </button>
              <a 
                href={aiEnhancedImage} 
                download={"aquascape_ai_" + Date.now() + ".jpg"} 
                class="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-500 hover:from-indigo-500 hover:to-sky-400 text-xs font-bold text-white flex items-center gap-2 shadow-lg cursor-pointer"
              >
                <Download class="w-4 h-4" /> Скачать фото (JPG)
              </a>
            </div>
          </div>
        {/if}

      </div>
    </div>
  {/if}

  <!-- МОДАЛЬНОЕ ОКНО ПАСПОРТА -->
  {#if isPassportOpen}
    <div class="modal-backdrop" onclick={(e) => { if (e.target === e.currentTarget) isPassportOpen = false; }}>
      <div class="modal-box w-[640px] max-h-[85vh] flex flex-col animate-fade-in">
        <div class="modal-header">
          <div class="flex items-center gap-2">
            <Printer class="w-5 h-5 text-emerald-400" />
            <span class="font-bold text-base text-white">Технический паспорт запуска проекта</span>
          </div>
          <button onclick={() => isPassportOpen = false} class="text-slate-400 hover:text-white"><X class="w-5 h-5" /></button>
        </div>

        <div class="modal-body overflow-y-auto p-4 flex flex-col gap-3">
          <div class="bg-slate-900/80 p-3 rounded-xl border border-white/10">
            <span class="text-xs font-bold text-sky-400 block mb-2">1. Параметры резервуара и грунта:</span>
            <div class="grid grid-cols-2 gap-2 text-xs">
              <div>Форма: <b class="text-white">{tankType.toUpperCase()}</b></div>
              <div>Габариты: <b class="text-white">{length} × {depth} × {height} см</b></div>
              <div>Объем брутто: <b class="text-white">{grossVolumeLiters} л</b></div>
              <div>Чистый объем воды: <b class="text-emerald-400">~{netWaterLiters} л</b></div>
              <div>Слой грунта: <b class="text-white">{frontLayerCm} см (перед) / {backLayerCm} см (зад)</b></div>
              <div>Расход сойла: <b class="text-white">{substrateVolumeLiters} л ({Math.ceil(substrateVolumeLiters / 9)} мешков по 9л)</b></div>
            </div>
          </div>

          <div class="bg-slate-900/80 p-3 rounded-xl border border-white/10">
            <span class="text-xs font-bold text-amber-400 block mb-2">2. Инженерные требования к оборудованию:</span>
            <div class="grid grid-cols-2 gap-2 text-xs">
              <div>Фильтрация (внешник): <b class="text-white">от {recFilterLph} л/ч</b></div>
              <div>Освещение (LED WRGB): <b class="text-white">~{recLightLumens} люмен</b></div>
              <div>Подача CO2: <b class="text-white">~{recCo2Bps} пуз/сек</b></div>
              <div>Дропчекер: <b class="text-white">Зеленый (25–30 мг/л)</b></div>
            </div>
          </div>

          <div class="bg-slate-900/80 p-3 rounded-xl border border-white/10">
            <span class="text-xs font-bold text-emerald-400 block mb-2">3. Спецификация закупки ({sceneItemsList.length} поз.):</span>
            <table class="w-full text-left text-[11px]">
              <thead>
                <tr class="border-b border-white/10 text-[9px] uppercase text-slate-400">
                  <th class="p-1">Категория</th>
                  <th class="p-1">Наименование</th>
                  <th class="p-1 text-right">Кол-во</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-white/5 font-mono">
                {#each sceneItemsList as it}
                  <tr>
                    <td class="p-1 text-slate-400">{it.category}</td>
                    <td class="p-1 text-white font-sans">{it.name}</td>
                    <td class="p-1 text-right text-emerald-300">{it.specs}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>

        <div class="modal-footer">
          <button onclick={() => window.print()} class="btn-generate">
            <Printer class="w-4 h-4" />
            <span>Печать / Сохранить в PDF</span>
          </button>
          <button onclick={() => isPassportOpen = false} class="btn-cancel">Закрыть</button>
        </div>
      </div>
    </div>
  {/if}

  <!-- МОДАЛЬНОЕ ОКНО TRIPO 3D -->
  {#if isAiModalOpen}
    <div class="modal-backdrop" onclick={(e) => { if (e.target === e.currentTarget && !aiGenerating) isAiModalOpen = false; }}>
      <div class="modal-box w-[440px] animate-fade-in">
        <div class="modal-header">
          <div class="flex items-center gap-2">
            <Wand2 class="w-5 h-5 text-purple-400" />
            <span class="font-bold text-base text-white">Tripo3D: Генерация модели по фото</span>
          </div>
          {#if !aiGenerating}
            <button onclick={() => isAiModalOpen = false} class="text-slate-400 hover:text-white"><X class="w-5 h-5" /></button>
          {/if}
        </div>

        <div class="modal-body p-4 flex flex-col gap-3">
          <div class="flex flex-col gap-1">
            <label class="text-xs text-slate-300">Фотография реальной коряги или камня:</label>
            <div 
              class="dropzone {uploadedImagePreview ? 'has-preview' : ''}"
              ondrop={handleFileDrop}
              onclick={() => { if (!aiGenerating) photoInputDom?.click(); }}
              role="button"
              tabindex="0"
              onkeydown={(e) => { if (e.key === 'Enter' && !aiGenerating) photoInputDom?.click(); }}
            >
              {#if uploadedImagePreview}
                <img src={uploadedImagePreview} alt="Превью" class="preview-img" />
                <span class="text-xs text-emerald-400 font-bold mt-2">Фото готово</span>
              {:else}
                <Upload class="w-7 h-7 text-purple-400 mb-1" />
                <span class="text-xs text-slate-200 font-bold">Выберите фото коряги или камня</span>
              {/if}
            </div>
          </div>

          <div class="flex flex-col gap-1">
            <label class="text-xs text-slate-300">Целевой размер (длина в см):</label>
            <div class="flex items-center gap-3">
              <input type="range" min="15" max="70" bind:value={aiObjSizeCm} disabled={aiGenerating} class="range-slider range-sky flex-1" />
              <span class="font-mono text-xs font-bold text-sky-400 w-12">{aiObjSizeCm} см</span>
            </div>
          </div>

          {#if aiGenerating}
            <div class="ai-loader-box">
              <div class="flex items-center gap-2">
                <Loader2 class="w-5 h-5 text-purple-400 animate-spin" />
                <span class="text-xs text-purple-200 font-bold">{aiStatusText}</span>
              </div>
              <div class="w-full bg-slate-900/80 rounded-full h-2 overflow-hidden border border-white/10 mt-1">
                <div class="bg-gradient-to-r from-purple-500 to-sky-400 h-2 transition-all duration-300" style="width: {aiProgressPercent}%"></div>
              </div>
            </div>
          {/if}
        </div>

        <div class="modal-footer">
          <button onclick={() => isAiModalOpen = false} disabled={aiGenerating} class="btn-cancel">Отмена</button>
          <button onclick={generate3DFromPhoto} disabled={aiGenerating || !uploadedImageFile} class="btn-generate">
            {#if aiGenerating}
              <Loader2 class="w-4 h-4 animate-spin" />
              <span>Генерация...</span>
            {:else}
              <Check class="w-4 h-4" />
              <span>Создать и поместить</span>
            {/if}
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  :global(body, html) {
    margin: 0; padding: 0; width: 100vw; height: 100vh; overflow: hidden;
    background-color: #040d1a; font-family: system-ui, sans-serif;
  }
  .font-mono { font-family: monospace; }
  .fullscreen-viewport { position: relative; width: 100vw; height: 100vh; overflow: hidden; }
  .canvas-layer { width: 100%; height: 100%; cursor: grab; }
  .canvas-layer:active { cursor: grabbing; }

  /* Верхний заголовок-шаги */
  .wizard-header {
    position: absolute; top: 12px; left: 16px; right: 16px;
    display: flex; align-items: center; justify-content: space-between;
    background: rgba(4, 16, 32, 0.9); backdrop-filter: blur(24px);
    border: 1px solid rgba(255, 255, 255, 0.16); border-radius: 14px;
    padding: 8px 16px; z-index: 30; box-shadow: 0 10px 30px rgba(0,0,0,0.5);
  }
  .brand { display: flex; align-items: center; gap: 8px; }
  .logo-box {
    width: 28px; height: 28px; border-radius: 8px;
    background: rgba(56, 189, 248, 0.2); border: 1px solid rgba(56, 189, 248, 0.4);
    display: flex; align-items: center; justify-content: center;
  }
  .brand-title { font-size: 13px; font-weight: 800; color: #fff; }

  .step-switcher {
    display: flex; background: rgba(15, 34, 56, 0.85);
    border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 10px; padding: 2px; gap: 2px;
  }
  .step-btn {
    display: flex; align-items: center; gap: 6px; padding: 5px 14px; border-radius: 8px;
    font-size: 11px; font-weight: 700; cursor: pointer; background: transparent; color: #94a3b8; border: none;
    transition: all 0.15s ease;
  }
  .step-btn-active { background: #0284c7 !important; color: #fff !important; }
  .step-num {
    width: 16px; height: 16px; border-radius: 50%; background: rgba(255, 255, 255, 0.15);
    display: flex; align-items: center; justify-content: center; font-size: 9px;
  }

  .btn-top-glass {
    padding: 6px; border-radius: 8px; background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.12); cursor: pointer; display: flex; align-items: center;
  }

  /* Шаг 1 */
  .step-panel-left {
    position: absolute; bottom: 24px; left: 20px; width: 310px;
    background: rgba(4, 16, 32, 0.92); backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.16); border-radius: 16px;
    padding: 16px; display: flex; flex-direction: column; gap: 12px; z-index: 25;
  }
  .btn-next-step {
    display: flex; align-items: center; justify-content: center; gap: 6px;
    padding: 10px; border-radius: 10px; background: #0284c7; color: #fff;
    font-size: 12px; font-weight: 700; border: none; cursor: pointer;
  }

  /* ШАГ 2: ВЕРХНИЙ РЕЖИМ УПРАВЛЕНИЯ */
  .center-mode-bar {
    position: fixed;
    top: 85px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(4, 16, 32, 0.92);
    backdrop-filter: blur(24px);
    border: 1px solid rgba(255, 255, 255, 0.16);
    border-radius: 12px;
    padding: 6px 14px;
    z-index: 50;
    box-shadow: 0 10px 25px rgba(0,0,0,0.5);
    cursor: grab;
  }
  .segmented-control {
    display: flex; background: rgba(15, 34, 56, 0.85);
    border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 8px; padding: 2px; gap: 2px;
  }
  .seg-btn {
    display: flex; align-items: center; gap: 4px; padding: 5px 8px; border-radius: 6px;
    font-size: 10px; font-weight: 600; cursor: pointer; background: transparent; color: #94a3b8; border: none;
  }
  .seg-active-drag { background: #0284c7 !important; color: #fff !important; }
  .seg-active-orbit { background: #059669 !important; color: #fff !important; }

  .btn-ai-header {
    display: flex; align-items: center; gap: 5px; padding: 6px 12px; border-radius: 8px;
    font-size: 11px; font-weight: 700; cursor: pointer;
    background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%); color: #fff;
    border: 1px solid rgba(167, 139, 250, 0.5);
  }
  .btn-upload-header {
    display: flex; align-items: center; gap: 4px; padding: 6px 10px; border-radius: 8px;
    font-size: 11px; font-weight: 600; cursor: pointer;
    background: rgba(15, 34, 56, 0.85); color: #cbd5e1; border: 1px solid rgba(255, 255, 255, 0.15);
  }

  /* ШАГ 2: ЛЕВАЯ ВЕРТИКАЛЬНАЯ БИБЛИОТЕКА (CAD DOCK) */
  .left-library-drawer {
    position: absolute; top: 80px; left: 16px; bottom: 16px; width: 230px;
    background: rgba(4, 16, 32, 0.94); backdrop-filter: blur(24px);
    border: 1px solid rgba(255, 255, 255, 0.16); border-radius: 16px;
    padding: 12px; display: flex; flex-direction: column; gap: 8px;
    z-index: 28; box-shadow: 0 15px 40px rgba(0,0,0,0.6);
  }
  .dock-header { cursor: move; user-select: none;  cursor: move; user-select: none;  display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255, 255, 255, 0.08); padding-bottom: 6px; }
  .lib-category-tabs { display: flex; gap: 3px; background: rgba(15, 34, 56, 0.7); padding: 2px; border-radius: 8px; }
  .lib-cat-btn {
    flex: 1; padding: 4px 6px; border-radius: 6px; font-size: 10px; font-weight: 700;
    color: #94a3b8; background: transparent; border: none; cursor: pointer; text-align: center;
  }
  .lib-cat-active { background: #0284c7; color: #fff; }

  .left-cards-scroll { display: flex; flex-direction: column; gap: 6px; overflow-y: auto; padding-right: 2px; }
  .asset-card-row {
    display: flex; align-items: center; gap: 8px; padding: 8px;
    background: rgba(15, 34, 56, 0.7); border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 10px; cursor: pointer; transition: all 0.15s ease;
  }
  .asset-card-row:hover { border-color: #38bdf8; background: rgba(15, 34, 56, 0.95); transform: translateX(2px); }
  .asset-icon { width: 30px; height: 30px; border-radius: 6px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .card-name { font-size: 11px; font-weight: 700; color: #f1f5f9; }
  .card-sub { font-size: 9px; color: #94a3b8; }

  /* ШАГ 2: ПРАВАЯ ПАНЕЛЬ ИНСПЕКТОРА */
  .right-inspector-panel {
    position: absolute; top: 80px; right: 16px; width: 280px;
    background: rgba(4, 16, 32, 0.92); backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.16); border-radius: 16px;
    padding: 14px; display: flex; flex-direction: column; gap: 10px; z-index: 25;
    box-shadow: 0 15px 35px rgba(0,0,0,0.6);
  }

  /* ШАГ 3: НИЖНЯЯ ПАНЕЛЬ ВИЗУАЛА */
  .step3-bottom-bar {
    position: fixed;
    bottom: 24px;
    left: 50% !important;
    transform: translateX(-50%) !important;
    display: flex;
    align-items: center;
    gap: 6px;
    background: rgba(4, 16, 32, 0.94);
    backdrop-filter: blur(24px);
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 16px;
    padding: 8px 12px;
    z-index: 50;
    box-shadow: 0 16px 36px rgba(0, 0, 0, 0.6);
    max-width: 96vw;
    overflow-x: auto;
  }
  .btn-step3 {
    display: flex; align-items: center; gap: 5px; padding: 8px 12px; border-radius: 10px;
    font-size: 11px; font-weight: 600; cursor: pointer; background: rgba(15, 34, 56, 0.85);
    color: #cbd5e1; border: 1px solid rgba(255, 255, 255, 0.15); white-space: nowrap;
  }
  .btn-active-tour { background: rgba(245, 158, 11, 0.25) !important; color: #fde68a !important; border-color: #f59e0b !important; }
  .btn-active-gold { background: rgba(245, 158, 11, 0.3) !important; color: #fbbf24 !important; border-color: #f59e0b !important; }

  .btn-step3-passport {
    display: flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 10px;
    font-size: 11px; font-weight: 700; cursor: pointer;
    background: linear-gradient(135deg, #059669 0%, #047857 100%); color: #fff;
    border: 1px solid rgba(52, 211, 153, 0.5); white-space: nowrap;
  }
  .btn-step3-snapshot {
    display: flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 10px;
    font-size: 11px; font-weight: 700; cursor: pointer;
    background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); color: #fff;
    border: 1px solid rgba(56, 189, 248, 0.6); white-space: nowrap;
  }

  .pill-btn {
    padding: 3px 7px; border-radius: 6px; font-size: 10px; font-weight: 600;
    background: transparent; color: #94a3b8; border: none; cursor: pointer;
  }
  .pill-active { background: #10b981; color: #fff; }

  .panel-section { border-bottom: 1px solid rgba(255, 255, 255, 0.08); padding-bottom: 8px; }
  .panel-section:last-child { border-bottom: none; padding-bottom: 0; }
  .panel-title { cursor: move; user-select: none;  cursor: move; user-select: none;  display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #e2e8f0; }

  .shape-btn {
    padding: 5px 3px; border-radius: 6px; background: rgba(56, 189, 248, 0.08);
    border: 1px solid rgba(56, 189, 248, 0.2); color: #94a3b8; font-size: 9px; font-weight: 600; cursor: pointer; text-align: center;
  }
  .shape-btn:hover { background: rgba(56, 189, 248, 0.2); color: #fff; }
  .shape-btn-active { background: #0284c7 !important; border-color: #38bdf8 !important; color: #fff !important; }

  .action-btn {
    background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 6px; padding: 4px; cursor: pointer; display: flex; align-items: center;
  }
  .slider-row { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
  .range-slider { height: 4px; border-radius: 4px; background: #0f2b48; outline: none; cursor: pointer; }
  .range-sky { accent-color: #38bdf8; }
  .range-emerald { accent-color: #10b981; }
  .range-amber { accent-color: #fbbf24; }

  .golden-ratio-overlay { position: absolute; inset: 0; pointer-events: none; z-index: 15; }
  .grid-line { position: absolute; background: rgba(245, 158, 11, 0.35); }
  .grid-v-1 { left: 38.2%; top: 0; bottom: 0; width: 1px; }
  .grid-v-2 { left: 61.8%; top: 0; bottom: 0; width: 1px; }
  .grid-h-1 { top: 38.2%; left: 0; right: 0; height: 1px; }
  .grid-h-2 { top: 61.8%; left: 0; right: 0; height: 1px; }
  .grid-focal { position: absolute; width: 12px; height: 12px; border-radius: 50%; border: 2px solid #f59e0b; background: rgba(245, 158, 11, 0.3); transform: translate(-50%, -50%); }
  .f-top-left { left: 38.2%; top: 38.2%; }
  .f-top-right { left: 61.8%; top: 38.2%; }
  .f-bottom-left { left: 38.2%; top: 61.8%; }
  .f-bottom-right { left: 61.8%; top: 61.8%; }

  .modal-backdrop { }
  .modal-box { }
  .modal-header { padding: 14px 18px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); display: flex; align-items: center; justify-content: space-between; }
  .modal-footer { padding: 12px 18px; border-top: 1px solid rgba(255, 255, 255, 0.1); display: flex; justify-content: flex-end; gap: 10px; background: rgba(3, 13, 24, 0.5); }
  .dropzone { border: 2px dashed rgba(255, 255, 255, 0.25); border-radius: 12px; padding: 18px; display: flex; flex-direction: column; align-items: center; text-align: center; background: rgba(3, 14, 26, 0.7); cursor: pointer; }
  .preview-img { max-height: 110px; border-radius: 8px; }
  .ai-loader-box { display: flex; flex-direction: column; gap: 6px; padding: 10px 12px; background: rgba(124, 58, 237, 0.15); border-radius: 10px; }
  .btn-cancel { padding: 7px 12px; border-radius: 8px; background: transparent; border: 1px solid rgba(255, 255, 255, 0.15); color: #cbd5e1; font-size: 11px; cursor: pointer; }
  .btn-generate {
    padding: 7px 16px; border-radius: 8px;
    background: linear-gradient(135deg, #059669 0%, #047857 100%);
    border: 1px solid rgba(52, 211, 153, 0.5); color: #fff; font-size: 11px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 6px;
  }

  @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  .animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }
.modal-backdrop { }
  .modal-box { }

  .modal-backdrop { }
  .modal-box { }
  .modal-image-container {
    flex: 1 1 auto !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    min-height: 200px !important;
    max-height: 52vh !important; /* Жестко ограничиваем высоту картинки */
    background: rgba(255, 255, 255, 0.02) !important;
    border-radius: 12px !important;
    border: 1px solid rgba(255, 255, 255, 0.05) !important;
    overflow: hidden !important;
    margin: 12px 0 !important;
  }
  .modal-image-container img {
    max-width: 100% !important;
    max-height: 100% !important;
    object-contain: contain !important;
    border-radius: 8px !important;
  }


  .modal-backdrop {
    position: fixed !important;
    inset: 0 !important;
    background: rgba(3, 7, 18, 0.94) !important;
    backdrop-filter: blur(16px) !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    z-index: 99999 !important;
    padding: 16px !important;
  }
  .modal-box {
    display: flex !important;
    flex-direction: column !important;
    width: 900px !important;
    max-width: 95vw !important;
    max-height: 85vh !important; /* Строго ограничиваем высоту */
    background: #020617 !important;
    border: 1px solid rgba(99, 102, 241, 0.4) !important;
    padding: 16px 20px !important;
    border-radius: 16px !important;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.75) !important;
    overflow: hidden !important;
  }
  .modal-image-container {
    flex: 1 1 auto !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    min-height: 200px !important;
    max-height: 52vh !important; /* Ограничиваем высоту контейнера картинки */
    background: rgba(255, 255, 255, 0.02) !important;
    border-radius: 12px !important;
    border: 1px solid rgba(255, 255, 255, 0.05) !important;
    overflow: hidden !important;
    margin: 12px 0 !important;
  }
  .modal-image-container img {
    max-width: 100% !important;
    max-height: 100% !important;
    object-fit: contain !important; /* Картинка сжимается под контейнер */
    border-radius: 8px !important;
  }

</style>
