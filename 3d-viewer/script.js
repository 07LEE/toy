let scene, camera, renderer, controls;
let currentObject = null; // 현재 씬에 표시되는 파일 객체
let gridHelper;

// DOM 요소
const container = document.getElementById('canvas-container');
const wireframeToggle = document.getElementById('wireframe-toggle');
const gridToggle = document.getElementById('grid-toggle');
const autorotateToggle = document.getElementById('autorotate-toggle');
const bgColorInput = document.getElementById('bg-color');
const pointSizeGroup = document.getElementById('point-size-group');
const pointSizeInput = document.getElementById('point-size');
const pointSizeValue = document.getElementById('point-size-value');
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const fileInfo = document.getElementById('file-info');
const fileNameSpan = document.querySelector('.file-name');
const clearFileBtn = document.getElementById('clear-file-btn');
const loadingOverlay = document.getElementById('loading-overlay');

// 초기화 실행
init();
animate();

function init() {
    // 1. 씬 생성
    scene = new THREE.Scene();
    scene.background = new THREE.Color(bgColorInput.value);

    // 2. 카메라 생성
    camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(5, 5, 5);

    // 3. 렌더러 생성
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // 4. 카메라 컨트롤 설정
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI;

    // 5. 조명 설정
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight1.position.set(10, 20, 15);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
    dirLight2.position.set(-10, -10, -10);
    scene.add(dirLight2);

    // 6. 그리드 헬퍼 설정
    gridHelper = new THREE.GridHelper(20, 20, 0x555555, 0x333333);
    scene.add(gridHelper);

    // 7. 이벤트 리스너 등록
    window.addEventListener('resize', onWindowResize);
    
    wireframeToggle.addEventListener('change', onWireframeToggle);
    gridToggle.addEventListener('change', onGridToggle);
    autorotateToggle.addEventListener('change', onAutoRotateToggle);
    bgColorInput.addEventListener('input', onBgColorChange);
    pointSizeInput.addEventListener('input', onPointSizeChange);

    // 파일 드래그 앤 드롭 및 클릭 업로드
    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));
    
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });
    
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            handleFile(e.dataTransfer.files[0]);
        }
    });

    clearFileBtn.addEventListener('click', clearLoadedFile);
}

// 윈도우 크기 변경 핸들러
function onWindowResize() {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

// 와이어프레임 토글 핸들러
function onWireframeToggle() {
    const isWireframe = wireframeToggle.checked;
    if (currentObject) {
        currentObject.traverse((child) => {
            if (child.isMesh) {
                child.material.wireframe = isWireframe;
            }
        });
    }
}

// 그리드 토글 핸들러
function onGridToggle() {
    gridHelper.visible = gridToggle.checked;
}

// 자동 회전 토글 핸들러
function onAutoRotateToggle() {
    controls.autoRotate = autorotateToggle.checked;
}

// 배경색 변경 핸들러
function onBgColorChange() {
    scene.background.set(bgColorInput.value);
}

// 포인트 크기 조절 핸들러 (PCD)
function onPointSizeChange() {
    const size = parseFloat(pointSizeInput.value);
    pointSizeValue.textContent = size;
    
    if (currentObject && currentObject.isPoints) {
        currentObject.material.size = size;
    }
}

// 로딩 화면 표시 제어
function showLoading(show) {
    loadingOverlay.style.display = show ? 'flex' : 'none';
}

// 파일 업로드 처리
function handleFile(file) {
    if (!file) return;
    
    const extension = file.name.split('.').pop().toLowerCase();
    if (extension !== 'obj' && extension !== 'pcd') {
        alert('지원하지 않는 파일 형식입니다. OBJ 또는 PCD 파일만 업로드할 수 있습니다.');
        return;
    }

    showLoading(true);
    const reader = new FileReader();

    if (extension === 'obj') {
        reader.onload = function(e) {
            try {
                const text = e.target.result;
                const loader = new THREE.OBJLoader();
                const obj = loader.parse(text);

                const material = new THREE.MeshStandardMaterial({
                    color: 0xdddddd,
                    roughness: 0.4,
                    metalness: 0.1,
                    wireframe: wireframeToggle.checked
                });

                obj.traverse((child) => {
                    if (child.isMesh) {
                        child.material = material;
                    }
                });

                setLoadedObject(obj, file.name, 'obj');
            } catch (err) {
                console.error(err);
                alert('OBJ 파일 파싱 중 에러가 발생했습니다.');
                showLoading(false);
            }
        };
        reader.readAsText(file);
    } else if (extension === 'pcd') {
        reader.onload = function(e) {
            try {
                const buffer = e.target.result;
                const loader = new THREE.PCDLoader();
                const points = loader.parse(buffer);

                // PCD 포인트 크기 및 색상 재설정
                points.material.size = parseFloat(pointSizeInput.value);
                points.material.color.setHex(0xffffff);

                setLoadedObject(points, file.name, 'pcd');
            } catch (err) {
                console.error(err);
                alert('PCD 파일 파싱 중 에러가 발생했습니다.');
                showLoading(false);
            }
        };
        reader.readAsArrayBuffer(file);
    }
}

// 파싱된 3D 객체를 씬에 설정
function setLoadedObject(object, name, type) {
    if (currentObject) {
        scene.remove(currentObject);
    }

    currentObject = object;
    scene.add(currentObject);

    // 파일 정보 UI 업데이트
    fileNameSpan.textContent = name;
    dropZone.style.display = 'none';
    fileInfo.style.display = 'flex';

    if (type === 'pcd') {
        pointSizeGroup.style.display = 'flex';
    } else {
        pointSizeGroup.style.display = 'none';
    }

    // 씬 크기에 맞추어 카메라 포커스 이동
    fitCameraToObject(currentObject);
    showLoading(false);
}

// 씬에 업로드된 파일을 제거하고 원래 상태로 복귀
function clearLoadedFile() {
    if (currentObject) {
        scene.remove(currentObject);
        currentObject = null;
    }

    fileInput.value = '';
    fileNameSpan.textContent = '';
    fileInfo.style.display = 'none';
    dropZone.style.display = 'flex';
    pointSizeGroup.style.display = 'none';
    
    // 카메라 위치 기본값 재설정
    camera.position.set(5, 5, 5);
    controls.target.set(0, 0, 0);
    controls.update();
}

// 3D 객체를 화면 중앙에 오도록 카메라 초점 조정
function fitCameraToObject(object) {
    const box = new THREE.Box3().setFromObject(object);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    // 객체의 위치를 (0, 0, 0) 중심으로 오프셋 이동
    object.position.x += (object.position.x - center.x);
    object.position.y += (object.position.y - center.y);
    object.position.z += (object.position.z - center.z);

    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / 2 * Math.tan(fov * 2));

    cameraZ *= 2.0; // 넉넉히 화면에 담기도록 스케일 조정
    if (cameraZ < 1) cameraZ = 5;

    camera.position.set(cameraZ, cameraZ, cameraZ);
    camera.lookAt(0, 0, 0);

    const minZ = box.min.z;
    const cameraToFarEdge = (minZ < 0) ? -minZ + cameraZ : cameraZ - minZ;
    camera.far = cameraToFarEdge * 5;
    camera.updateProjectionMatrix();

    if (controls) {
        controls.target.set(0, 0, 0);
        controls.maxDistance = cameraToFarEdge * 3;
        controls.update();
    }
}

// 렌더 프레임 루프
function animate() {
    requestAnimationFrame(animate);
    
    if (controls) {
        controls.update();
    }

    renderer.render(scene, camera);
}
