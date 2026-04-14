// ============================================================
// ashrain.out — saveImageToDevice
// ============================================================
// 이미지를 사용자의 기기 다운로드 폴더에 저장하는 트리거.
// PWA 환경에서 가장 호환성 좋은 <a download> 방식 사용.
// 모바일: Downloads 폴더 / iOS: 파일 앱 / 데스크톱: 기본 다운로드 폴더
//
// 사용처:
// - 오답노트(WrongNoteScreen): 카메라 촬영 직후 자동 저장
// - 문제 분석(ProblemScreen): 동일하게 촬영 직후 자동 저장
//
// 옵션은 settings.autoSaveToDevice 토글로 ON/OFF 가능.

/**
 * dataURL(base64) 이미지를 파일로 다운로드 트리거.
 * @param {string} dataUrl - "data:image/jpeg;base64,..." 형식
 * @param {string} [filename] - 저장 파일명 (확장자 포함 권장)
 * @returns {boolean} 성공 여부
 */
export function saveImageToDevice(dataUrl, filename) {
  try {
    if (!dataUrl || typeof dataUrl !== "string" || !dataUrl.startsWith("data:")) {
      console.warn("[saveImageToDevice] invalid dataUrl");
      return false;
    }
    const name = filename || makeDefaultFilename(dataUrl);
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = name;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    // 정리 (즉시 제거하면 일부 모바일에서 다운로드 취소되는 경우 있어 약간 지연)
    setTimeout(() => {
      try {
        document.body.removeChild(a);
      } catch {
        /* noop */
      }
    }, 100);
    return true;
  } catch (e) {
    console.error("[saveImageToDevice] error:", e);
    return false;
  }
}

/**
 * dataURL의 mime type에서 확장자 추출 후 기본 파일명 생성.
 */
function makeDefaultFilename(dataUrl) {
  const match = /^data:image\/([a-zA-Z0-9+]+);/.exec(dataUrl);
  let ext = "jpg";
  if (match && match[1]) {
    const t = match[1].toLowerCase();
    if (t === "jpeg" || t === "jpg") ext = "jpg";
    else if (t === "png") ext = "png";
    else if (t === "webp") ext = "webp";
    else ext = t;
  }
  const ts = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const stamp =
    `${ts.getFullYear()}${pad(ts.getMonth() + 1)}${pad(ts.getDate())}` +
    `_${pad(ts.getHours())}${pad(ts.getMinutes())}${pad(ts.getSeconds())}`;
  return `ashrain_${stamp}.${ext}`;
}

/**
 * 설정의 autoSaveToDevice가 켜져 있을 때만 저장.
 * 호출부에서 매번 if 분기 작성하지 않도록 헬퍼 제공.
 */
export function maybeSaveImageToDevice(dataUrl, autoSaveEnabled, filename) {
  if (!autoSaveEnabled) return false;
  return saveImageToDevice(dataUrl, filename);
}
