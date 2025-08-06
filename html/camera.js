
let stream = null;
let capturedImages = [];
let video, canvas, canvasRaw, canvasThumb, ctx, ctxRaw, ctxThumb;

// DOM 요소들을 안전하게 초기화
function initializeElements() {
    video = document.getElementById('video');
    canvas = document.getElementById('canvas');
    canvasRaw = document.getElementById('canvas_raw');
    canvasThumb = document.getElementById('canvas_thumb');
    
    if (canvas && canvasRaw && canvasThumb) {
        ctx = canvas.getContext('2d');
        ctxRaw = canvasRaw.getContext('2d');
        ctxThumb = canvasThumb.getContext('2d');
    }
}

// 페이지 로드 시 카메라 초기화
document.addEventListener('DOMContentLoaded', function() {
    initializeElements();
    initAddressBarHiding();  // 주소창 숨김 먼저 초기화
    initCamera();
    initTouchControls();
});

// 터치 제어 초기화
function initTouchControls() {
const video = document.getElementById('video');
let initialDistance = 0;
let initialZoom = 1;

// 핀치 줌 시작
video.addEventListener('touchstart', function(e) {
if (e.touches.length === 2) {
  e.preventDefault();
  const touch1 = e.touches[0];
  const touch2 = e.touches[1];
  initialDistance = Math.hypot(
    touch1.clientX - touch2.clientX,
    touch1.clientY - touch2.clientY
  );
  initialZoom = currentZoom;
}
});

// 핀치 줌 중
video.addEventListener('touchmove', function(e) {
if (e.touches.length === 2) {
  e.preventDefault();
  const touch1 = e.touches[0];
  const touch2 = e.touches[1];
  const currentDistance = Math.hypot(
    touch1.clientX - touch2.clientX,
    touch1.clientY - touch2.clientY
  );

  if (initialDistance > 0) {
    const scale = currentDistance / initialDistance;
    const newZoom = initialZoom * scale;
    currentZoom = Math.max(minZoom, Math.min(maxZoom, newZoom));
    applyZoom();
  }
}
});

// 더블 탭으로 줌 토글
let lastTap = 0;
video.addEventListener('touchend', function(e) {
const currentTime = new Date().getTime();
const tapLength = currentTime - lastTap;
if (tapLength < 500 && tapLength > 0 && e.touches.length === 0) {
  e.preventDefault();
  // 더블 탭: 줌 토글 (1x <-> 2x)
  currentZoom = currentZoom === 1 ? 2 : 1;
  applyZoom();
}
lastTap = currentTime;
});
}

// 카메라 초기화
async function initCamera() {
try {
// 카메라 권한 요청 및 스트림 가져오기 (갤럭시 카메라 수준의 고화질)
const constraints = {
  video: {
    facingMode: 'environment', // 후면 카메라 우선 (모바일)
    width: { ideal: 3840, min: 1920 }, // 4K 우선, 최소 FHD
    height: { ideal: 2160, min: 1080 },
    frameRate: { ideal: 30, min: 15 }, // 부드러운 프레임률
    aspectRatio: { ideal: 16/9 } // 갤럭시 카메라 비율
  },
  audio: false
};

stream = await navigator.mediaDevices.getUserMedia(constraints);
video.srcObject = stream;

// 비디오 로드 후 실제 해상도 정보 출력
video.addEventListener('loadedmetadata', function() {
  console.log(`카메라 해상도: ${video.videoWidth}x${video.videoHeight}`);
  console.log(`디스플레이 크기: ${video.clientWidth}x${video.clientHeight}`);
  adjustVideoDisplay();
});

// 비디오가 로드되면 캔버스 크기 설정
video.addEventListener('loadedmetadata', function() {
  resizeCanvas();
});

// 화면 방향 변경시 디스플레이 재조정 (개선된 버전)
let resizeTimeout;

function handleResize() {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    adjustVideoDisplay();
    resizeCanvas();
    
    // iOS Safari의 경우 추가 조정
    if (navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome')) {
      setTimeout(() => {
        adjustVideoDisplay();
      }, 300);
    }
  }, 150);
}

window.addEventListener('orientationchange', handleResize);
window.addEventListener('resize', handleResize);

// 모바일 디바이스 특별 처리 (스크롤 완전 방지)
if (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
  // 스크롤 완전 차단
  function preventScroll(e) {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }

  // 모든 스크롤 이벤트 차단
  document.addEventListener('scroll', preventScroll, { passive: false });
  document.addEventListener('touchmove', preventScroll, { passive: false });
  document.addEventListener('wheel', preventScroll, { passive: false });
  
  // 바디와 문서 스크롤 강제로 0으로 유지
  setInterval(function() {
    if (document.body.scrollTop !== 0) document.body.scrollTop = 0;
    if (document.documentElement.scrollTop !== 0) document.documentElement.scrollTop = 0;
    if (window.scrollY !== 0) window.scrollTo(0, 0);
  }, 100);

  // 강화된 주소창 숨기기 (모든 브라우저 지원)
  function hideAddressBar() {
    // 스크롤을 통한 주소창 숨기기
    window.scrollTo(0, 1);
    setTimeout(() => {
      window.scrollTo(0, 0);
      // viewport 높이 재계산
      let vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty("--vh", `${vh}px`);
    }, 50);
  }

  // 다양한 이벤트에서 주소창 숨기기 시도
  document.addEventListener('touchstart', hideAddressBar, { passive: true });
  document.addEventListener('touchend', hideAddressBar, { passive: true });
  document.addEventListener('click', hideAddressBar, { passive: true });
  
  // 페이지 로드 직후와 시간 간격으로 주소창 숨기기
  setTimeout(hideAddressBar, 100);
  setTimeout(hideAddressBar, 500);
  setTimeout(hideAddressBar, 1000);
  
  // 방향 변경시에도 주소창 숨기기
  window.addEventListener('orientationchange', function() {
    setTimeout(hideAddressBar, 100);
    setTimeout(hideAddressBar, 500);
  });
}

// 모든 스크롤 방지 (데스크탑 포함)
document.addEventListener('DOMContentLoaded', function() {
  document.body.style.overflow = 'hidden';
  document.documentElement.style.overflow = 'hidden';
  
  // 키보드 방향키 스크롤도 방지
  window.addEventListener('keydown', function(e) {
    if([32, 33, 34, 35, 36, 37, 38, 39, 40].indexOf(e.keyCode) > -1) {
      e.preventDefault();
    }
  }, false);
});

} catch (error) {
console.error('카메라 접근 오류:', error);
alert('카메라에 접근할 수 없습니다. 카메라 권한을 확인해주세요.');

// 후면 카메라가 없는 경우 전면 카메라 시도
if (error.name === 'OverconstrainedError') {
  try {
    const fallbackConstraints = {
      video: {
        facingMode: 'user', // 전면 카메라
        width: { ideal: 2560, min: 1280 }, // 전면도 고화질
        height: { ideal: 1440, min: 720 },
        frameRate: { ideal: 30, min: 15 },
        aspectRatio: { ideal: 16/9 }
      },
      audio: false
    };
    stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
    video.srcObject = stream;
    
    video.addEventListener('loadedmetadata', function() {
      console.log(`전면 카메라 해상도: ${video.videoWidth}x${video.videoHeight}`);
      adjustVideoDisplay();
    });
  } catch (fallbackError) {
    console.error('전면 카메라 접근 오류:', fallbackError);
  }
}
}
}

// 비디오 디스플레이 조정 (갤럭시 카메라처럼)
function adjustVideoDisplay() {
const video = document.getElementById('video');
const container = document.querySelector('.shot_area');

// 안전성 체크: video와 container가 존재하고 비디오가 로드되었는지 확인
if (!video || !container) {
console.warn('Video 또는 container 요소를 찾을 수 없습니다.');
return;
}

if (!video.videoWidth || !video.videoHeight) {
console.warn('Video가 아직 로드되지 않았습니다.');
return;
}

try {
const videoAspectRatio = video.videoWidth / video.videoHeight;
const containerAspectRatio = container.clientWidth / container.clientHeight;

// 갤럭시 카메라처럼 화면을 꽉 채우되 비율 유지
if (videoAspectRatio > containerAspectRatio) {
  // 비디오가 더 넓은 경우: 높이를 맞춤
  video.style.width = 'auto';
  video.style.height = '100%';
  video.style.objectFit = 'cover';
} else {
  // 비디오가 더 높은 경우: 너비를 맞춤
  video.style.width = '100%';
  video.style.height = 'auto';
  video.style.objectFit = 'cover';
}

// 캔버스도 동일하게 설정
resizeCanvas();
} catch (error) {
console.error('adjustVideoDisplay 오류:', error);
}
}

// 캔버스 크기 조정 (숨김 상태로 변경)
function resizeCanvas() {
// 안전성 체크: video 요소와 캔버스들이 존재하는지 확인
if (!video) {
console.warn('Video 요소를 찾을 수 없습니다.');
return;
}

if (!video.videoWidth || !video.videoHeight) {
console.warn('Video가 아직 로드되지 않았습니다.');
return;
}

try {
const containerWidth = document.querySelector('.shot_area')?.clientWidth;
const containerHeight = document.querySelector('.shot_area')?.clientHeight;

if (!containerWidth || !containerHeight) {
  console.warn('Container 크기를 가져올 수 없습니다.');
  return;
}

// 캔버스를 숨김 상태로 설정하고 실제 비디오 크기로 맞춤
[canvas, canvasRaw, canvasThumb].forEach(c => {
  if (c) {
    c.width = video.videoWidth;
    c.height = video.videoHeight;
    c.style.display = 'none'; // 캔버스 숨김
  }
});

// 썸네일 캔버스만 작게 설정
if (canvasThumb) {
  const aspectRatio = video.videoWidth / video.videoHeight;
  canvasThumb.width = 300;
  canvasThumb.height = 300 / aspectRatio;
}
} catch (error) {
console.error('resizeCanvas 오류:', error);
}
}

// 사진 촬영
function capturePhoto() {
if (!video.videoWidth || !video.videoHeight) {
alert('카메라가 준비되지 않았습니다.');
return;
}

try {
// 현재 비디오 상태 (줌, 필터 등)를 반영한 캡처
const tempCanvas = document.createElement('canvas');
const tempCtx = tempCanvas.getContext('2d');

// 임시 캔버스를 비디오 크기로 설정
tempCanvas.width = video.videoWidth;
tempCanvas.height = video.videoHeight;

// 필터 적용
if (video.style.filter) {
  tempCtx.filter = video.style.filter;
}

// 줌이 적용된 상태로 캡처
if (currentZoom > 1) {
  const scaledWidth = video.videoWidth / currentZoom;
  const scaledHeight = video.videoHeight / currentZoom;
  const offsetX = (video.videoWidth - scaledWidth) / 2;
  const offsetY = (video.videoHeight - scaledHeight) / 2;
  
  tempCtx.drawImage(video, offsetX, offsetY, scaledWidth, scaledHeight, 0, 0, video.videoWidth, video.videoHeight);
} else {
  tempCtx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
}

// 원본 해상도로 캡처 (임시 캔버스에서)
canvasRaw.width = video.videoWidth;
canvasRaw.height = video.videoHeight;
ctxRaw.drawImage(tempCanvas, 0, 0);

// 화면 표시용 캡처
ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);

// 썸네일 생성
ctxThumb.drawImage(tempCanvas, 0, 0, canvasThumb.width, canvasThumb.height);

// 이미지 데이터 저장
const imageData = canvasRaw.toDataURL('image/jpeg', 0.9);
const thumbData = canvasThumb.toDataURL('image/jpeg', 0.7);

const captureInfo = {
  id: Date.now(),
  timestamp: new Date().toLocaleString(),
  fullImage: imageData,
  thumbnail: thumbData
};

capturedImages.push(captureInfo);

// 촬영 효과 (화면 깜빡임)
showCaptureEffect();

// 썸네일 업데이트
updateThumbnail(captureInfo.thumbnail);

// 성공 메시지
console.log('사진이 촬영되었습니다:', captureInfo.timestamp);

// 로컬 스토리지에 저장
localStorage.setItem('capturedImages', JSON.stringify(capturedImages));

} catch (error) {
console.error('촬영 오류:', error);
alert('사진 촬영 중 오류가 발생했습니다.');
}
}

// 촬영 효과
function showCaptureEffect() {
const overlay = document.createElement('div');
overlay.style.position = 'fixed';
overlay.style.top = '0';
overlay.style.left = '0';
overlay.style.width = '100%';
overlay.style.height = '100%';
overlay.style.backgroundColor = 'white';
overlay.style.opacity = '0.8';
overlay.style.zIndex = '9999';
overlay.style.pointerEvents = 'none';

document.body.appendChild(overlay);

setTimeout(() => {
document.body.removeChild(overlay);
}, 150);
}



// 줌 레벨 관리 (갤럭시 스타일)
let currentZoom = 1;
const zoomLevels = [1, 2, 3]; // 갤럭시 카메라 표준 줌 레벨

// 특정 줌 레벨로 설정
function setZoom(zoomLevel) {
currentZoom = zoomLevel;
applyZoom();
updateZoomButtons();
console.log(`줌 설정: ${currentZoom}x`);
}

// 줌 버튼 활성화 상태 업데이트
function updateZoomButtons() {
document.querySelectorAll('.zoom-btn').forEach(btn => {
const zoom = parseInt(btn.dataset.zoom);
if (zoom === currentZoom) {
  btn.classList.add('active');
} else {
  btn.classList.remove('active');
}
});
}

// 줌 적용
function applyZoom() {
const video = document.getElementById('video');

// 안전성 체크: video 요소가 존재하는지 확인
if (!video) {
console.warn('Video 요소를 찾을 수 없습니다.');
return;
}

try {
video.style.transform = `scale(${currentZoom})`;

// 부드러운 줌 애니메이션
video.style.transition = 'transform 0.3s ease-out';
setTimeout(() => {
  if (video) {
    video.style.transition = '';
  }
}, 300);
} catch (error) {
console.error('applyZoom 오류:', error);
}
}

// 레거시 함수들 (기존 터치 제스처 호환성)
function zoomIn() {
const currentIndex = zoomLevels.indexOf(currentZoom);
if (currentIndex < zoomLevels.length - 1) {
setZoom(zoomLevels[currentIndex + 1]);
}
}

function zoomOut() {
const currentIndex = zoomLevels.indexOf(currentZoom);
if (currentIndex > 0) {
setZoom(zoomLevels[currentIndex - 1]);
}
}

// 밝기 조절
function adjustBrightness(delta) {
const currentFilter = video.style.filter || '';
const brightnessMatch = currentFilter.match(/brightness\(([^)]+)\)/);
let currentBrightness = brightnessMatch ? parseFloat(brightnessMatch[1]) : 1;

currentBrightness = Math.max(0.3, Math.min(2, currentBrightness + delta));
video.style.filter = currentFilter.replace(/brightness\([^)]+\)/, '') + ` brightness(${currentBrightness})`;
}

// 썸네일 업데이트
function updateThumbnail(thumbnailData) {
const container = document.getElementById('thumbnailContainer');
const placeholder = container.querySelector('.thumbnail-placeholder');

if (placeholder) {
// 기존 placeholder 제거하고 실제 이미지로 교체
placeholder.remove();
const img = document.createElement('img');
img.src = thumbnailData;
img.className = 'thumbnail-image';
img.alt = '최근 촬영 사진';
container.appendChild(img);
} else {
// 기존 이미지 업데이트
const existingImg = container.querySelector('.thumbnail-image');
if (existingImg) {
  existingImg.src = thumbnailData;
}
}
}

// 갤럭시 스타일 사진 목록 표시
function showPhotoList() {
if (capturedImages.length === 0) {
alert('촬영된 사진이 없습니다.');
return;
}

// 기존 팝업 제거
const existingPopup = document.querySelector('.photo-list-popup');
if (existingPopup) {
existingPopup.remove();
}

const popup = document.createElement('div');
popup.className = 'photo-list-popup';
popup.style.display = 'flex';
popup.style.alignItems = 'flex-start';
popup.style.justifyContent = 'center';
popup.style.paddingTop = '20px';

popup.innerHTML = `
<div class="photo-list-content">
  <div class="photo-list-header">
    <h3>갤러리 (${capturedImages.length}장)</h3>
    <button class="close-btn" onclick="closePhotoList()">✕</button>
  </div>
  <div class="photo-grid">
    ${capturedImages.map((img, index) => `
      <div class="photo-item" onclick="viewPhoto(${index})">
        <img src="${img.thumbnail}" alt="사진 ${index + 1}">
        <div class="photo-item-info">
          <div>${img.timestamp}</div>
        </div>
      </div>
    `).join('')}
  </div>
</div>
`;

document.body.appendChild(popup);
}

// 사진 목록 닫기
function closePhotoList() {
const popup = document.querySelector('.photo-list-popup');
if (popup) {
popup.remove();
}
}

// 개별 사진 보기
function viewPhoto(index) {
const img = capturedImages[index];
if (!img) return;

const viewer = document.createElement('div');
viewer.style.position = 'fixed';
viewer.style.top = '0';
viewer.style.left = '0';
viewer.style.width = '100%';
viewer.style.height = '100%';
viewer.style.background = 'rgba(0, 0, 0, 0.95)';
viewer.style.zIndex = '1001';
viewer.style.display = 'flex';
viewer.style.alignItems = 'center';
viewer.style.justifyContent = 'center';
viewer.style.flexDirection = 'column';
viewer.style.padding = '20px';

viewer.innerHTML = `
<div style="position: relative; max-width: 90%; max-height: 80%;">
  <img src="${img.fullImage}" style="width: 100%; height: 100%; object-fit: contain;">
</div>
<div style="margin-top: 20px; display: flex; gap: 15px;">
  <button onclick="downloadImage(${index})" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">다운로드</button>
  <button onclick="deleteImage(${index})" style="padding: 10px 20px; background: #dc3545; color: white; border: none; border-radius: 5px; cursor: pointer;">삭제</button>
  <button onclick="this.parentElement.parentElement.remove()" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer;">닫기</button>
</div>
`;

// 배경 클릭시 닫기
viewer.addEventListener('click', function(e) {
if (e.target === viewer) {
  viewer.remove();
}
});

document.body.appendChild(viewer);
}



// 이미지 다운로드
function downloadImage(index) {
const img = capturedImages[index];
const link = document.createElement('a');
link.download = `photo_${img.id}.jpg`;
link.href = img.fullImage;
link.click();
}

// 이미지 삭제
function deleteImage(index) {
if (confirm('이 사진을 삭제하시겠습니까?')) {
capturedImages.splice(index, 1);
localStorage.setItem('capturedImages', JSON.stringify(capturedImages));
// 팝업 새로고침
document.querySelector('div[style*="position: fixed"]').remove();
showPhotoList();
}
}



// 페이지 언로드시 카메라 스트림 정리
window.addEventListener('beforeunload', function() {
if (stream) {
stream.getTracks().forEach(track => track.stop());
}
});

// 로컬 스토리지에서 이전 촬영 이미지 복원 (썸네일은 표시하지 않음)
function restoreSavedImages() {
const savedImages = localStorage.getItem('capturedImages');
if (savedImages) {
try {
  capturedImages = JSON.parse(savedImages);
  console.log(`${capturedImages.length}개의 저장된 사진을 찾았습니다.`);
  
  // 썸네일은 새로 촬영할 때까지 표시하지 않음
  // 갤러리에서는 이전 사진들을 볼 수 있음
} catch (error) {
  console.error('저장된 이미지 복원 오류:', error);
}
}
}

// 모든 저장된 사진 데이터 완전 삭제
function clearAllSavedImages() {
localStorage.removeItem('capturedImages');
capturedImages = [];
resetThumbnail();
console.log('모든 저장된 사진이 삭제되었습니다.');
}

// 페이지 로드 시 실행
document.addEventListener('DOMContentLoaded', function() {
// 완전 초기화 (예전 사진들 모두 삭제)
clearAllSavedImages();

// 썸네일을 초기 상태(빈 상태)로 리셋
resetThumbnail();
});

// 썸네일을 초기 상태로 리셋
function resetThumbnail() {
    const container = document.getElementById('thumbnailContainer');
    const existingImg = container.querySelector('.thumbnail-image');

    if (existingImg) {
        existingImg.remove();

        // 기본 placeholder 다시 추가
        const placeholder = document.createElement('div');
        placeholder.className = 'thumbnail-placeholder';
        placeholder.innerHTML = '<span>📷</span>';
        container.appendChild(placeholder);
    }
}

// 주소창 숨김 기능 초기화
function initAddressBarHiding() {
    // 모바일 디바이스에서만 실행
    if (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        // 강화된 주소창 숨기기 (모든 브라우저 지원)
        function hideAddressBar() {
            // 스크롤을 통한 주소창 숨기기
            window.scrollTo(0, 1);
            setTimeout(() => {
                window.scrollTo(0, 0);
                // viewport 높이 재계산
                let vh = window.innerHeight * 0.01;
                document.documentElement.style.setProperty("--vh", `${vh}px`);
            }, 50);
        }

        // 다양한 이벤트에서 주소창 숨기기 시도
        document.addEventListener('touchstart', hideAddressBar, { passive: true });
        document.addEventListener('touchend', hideAddressBar, { passive: true });
        document.addEventListener('click', hideAddressBar, { passive: true });
        
        // 페이지 로드 직후와 시간 간격으로 주소창 숨기기
        setTimeout(hideAddressBar, 100);
        setTimeout(hideAddressBar, 500);
        setTimeout(hideAddressBar, 1000);
        
        // 방향 변경시에도 주소창 숨기기
        window.addEventListener('orientationchange', function() {
            setTimeout(hideAddressBar, 100);
            setTimeout(hideAddressBar, 500);
        });

        // 스크롤 완전 차단
        function preventScroll(e) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }

        // 모든 스크롤 이벤트 차단
        document.addEventListener('scroll', preventScroll, { passive: false });
        document.addEventListener('touchmove', preventScroll, { passive: false });
        document.addEventListener('wheel', preventScroll, { passive: false });
        
        // 바디와 문서 스크롤 강제로 0으로 유지
        setInterval(function() {
            if (document.body.scrollTop !== 0) document.body.scrollTop = 0;
            if (document.documentElement.scrollTop !== 0) document.documentElement.scrollTop = 0;
            if (window.scrollY !== 0) window.scrollTo(0, 0);
        }, 100);
    }
}
