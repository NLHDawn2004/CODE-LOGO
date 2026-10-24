/* Import original images from a public Google Drive folder through Drive API v3. */
(() => {
  'use strict';
  const folderInput = document.getElementById('driveFolderInput');
  const keyInput = document.getElementById('driveApiKey');
  const loadButton = document.getElementById('loadDriveBtn');
  const cancelButton = document.getElementById('cancelDriveBtn');
  const status = document.getElementById('driveStatus');
  const progress = document.getElementById('driveProgress');
  let controller = null;
  const MAX_BYTES = 30 * 1024 * 1024;
  const isLocal = location.protocol === 'http:' && ['127.0.0.1','localhost'].includes(location.hostname);
  const message = text => {status.textContent = text;};
  function parseFolder(value) {
    let url;
    try {url = new URL(value.trim());} catch {throw new Error('Vui lòng dán link thư mục Google Drive hợp lệ.');}
    if(url.protocol !== 'https:' || url.hostname !== 'drive.google.com') throw new Error('Link phải là thư mục Google Drive.');
    const id = url.pathname.match(/\/folders\/([\w-]+)/)?.[1] || (url.pathname === '/open' ? url.searchParams.get('id') : '');
    if(!id || !/^[\w-]{10,200}$/.test(id)) throw new Error('Không tìm thấy mã thư mục trong link Google Drive.');
    const resourceKey = url.searchParams.get('resourcekey');
    if(resourceKey && !/^[\w-]{1,200}$/.test(resourceKey)) throw new Error('Link Google Drive không hợp lệ.');
    return {id,resourceKey};
  }
  async function request(url,apiKey,signal,resource) {
    const headers = {'X-Goog-Api-Key':apiKey};
    if(resource?.resourceKey) headers['X-Goog-Drive-Resource-Keys'] = resource.id + '/' + resource.resourceKey;
    let response;
    try {response = await fetch(url,{headers,signal:AbortSignal.any([signal,AbortSignal.timeout(45000)])});}
    catch(error) {
      if(signal.aborted) throw new DOMException('Đã hủy','AbortError');
      if(error.name === 'TimeoutError') throw new Error('Google Drive phản hồi quá lâu. Hãy thử lại.');
      throw new Error('Không kết nối được Google Drive. Kiểm tra mạng và mở công cụ bằng MO-CONG-CU.cmd.');
    }
    if(!response.ok) {
      let error = {};try {error = (await response.json()).error || {};} catch {}
      const reasons = [...(error.errors || []).map(e=>e.reason),...(error.details || []).map(e=>e.reason)];
      if(reasons.some(r=>/SERVICE_DISABLED|accessNotConfigured/.test(r))) throw new Error('Chưa bật Google Drive API cho dự án của khóa này. Hãy bật API trong Google Cloud.');
      if(reasons.some(r=>/REFERER|IP_ADDRESS/.test(r))) throw new Error('API Key chưa cho phép địa chỉ công cụ. Hãy thêm http://127.0.0.1:18764/* vào Websites của khóa.');
      if(response.status===400 || response.status===401 || reasons.some(r=>/API_KEY_INVALID|keyInvalid/.test(r))) throw new Error('API Key không hợp lệ hoặc cấu hình chưa đúng. Hãy kiểm tra lại khóa Google Drive.');
      if(response.status===429 || reasons.some(r=>/quota|rateLimit|dailyLimit/i.test(r))) throw new Error('Đã chạm giới hạn Google Drive API. Hãy đợi rồi thử lại.');
      throw new Error('Google Drive không cho phép đọc hoặc tải dữ liệu (HTTP ' + response.status + '). Kiểm tra quyền xem và tải ảnh của thư mục.');
    }
    return response;
  }
  async function listImages(folder,apiKey,signal) {
    const files = new Map();let token = '';const seenTokens = new Set();
    do {
      const url = new URL('https://www.googleapis.com/drive/v3/files');
      url.search = new URLSearchParams({q:"'" + folder.id + "' in parents and trashed = false and mimeType contains 'image/'",
        fields:'nextPageToken,incompleteSearch,files(id,name,mimeType,size,resourceKey)',pageSize:'100',orderBy:'name'});
      if(token) url.searchParams.set('pageToken',token);
      const response = await request(url,apiKey,signal,folder);
      const data = await response.json();
      if(data.incompleteSearch) throw new Error('Google Drive chưa trả về đầy đủ danh sách. Hãy thử lại.');
      for(const file of data.files || []) if(file.mimeType?.startsWith('image/') && /^[\w-]{10,200}$/.test(file.id)) files.set(file.id,file);
      token = data.nextPageToken || '';
      if(token && seenTokens.has(token)) throw new Error('Không thể tải đủ danh sách Google Drive. Hãy thử lại.');
      seenTokens.add(token);
      if(files.size>1000) throw new Error('Thư mục có hơn 1000 ảnh. Hãy chia thành các thư mục nhỏ hơn.');
      message('Đã tìm thấy ' + files.size + ' logo' + (token ? ', đang đọc tiếp…' : '.'));
    } while(token);
    return [...files.values()];
  }
  async function downloadImage(file,signal) {
    if(Number(file.size)>MAX_BYTES) throw new Error('Ảnh vượt quá giới hạn 30 MB.');
    // Read the public original through our own local server to avoid Drive media CORS blocks.
    const url = new URL('/api/drive/image',location.origin);
    url.searchParams.set('id',file.id);
    if(file.resourceKey) url.searchParams.set('resourcekey',file.resourceKey);
    let response;
    try {response = await fetch(url,{signal:AbortSignal.any([signal,AbortSignal.timeout(60000)])});}
    catch(error) {
      if(signal.aborted) throw new DOMException('Đã hủy','AbortError');
      throw new Error('Không kết nối được công cụ tải ảnh. Hãy mở lại MO-CONG-CU.cmd.');
    }
    if(!response.ok) {
      let error;try {error=(await response.json()).error;} catch {}
      throw new Error(error || 'Không tải được ảnh từ Drive (HTTP ' + response.status + ').');
    }
    if(!response.headers.get('content-type')?.startsWith('image/')) throw new Error('Drive không trả về nội dung ảnh.');
    if(Number(response.headers.get('content-length'))>MAX_BYTES) {await response.body.cancel();throw new Error('Ảnh vượt quá giới hạn 30 MB.');}
    const reader = response.body.getReader();const chunks=[];let bytes=0;
    while(true) {
      const {value,done} = await reader.read();if(done) break;
      bytes+=value.byteLength;if(bytes>MAX_BYTES) {await reader.cancel();throw new Error('Ảnh vượt quá giới hạn 30 MB.');}
      chunks.push(value);
    }
    if(!bytes) throw new Error('Ảnh rỗng.');
    const image = new File(chunks,file.name,{type:file.mimeType});
    await readImageFile(image);
    return image;
  }
  cancelButton.onclick = () => controller?.abort();
  loadButton.onclick = async () => {
    let folder;const apiKey = keyInput.value.trim();
    try {folder=parseFolder(folderInput.value);} catch(error) {message(error.message);return;}
    if(!isLocal) {message('Để dùng Drive với API Key đã cấu hình, hãy mở tệp MO-CONG-CU.cmd rồi dán lại link tại trang công cụ.');return;}
    if(!apiKey) {message('Chưa đọc được cấu hình Google Drive. Hãy mở lại MO-CONG-CU.cmd hoặc tải lại trang.');return;}
    const run = new AbortController();controller=run;
    loadButton.disabled=true;cancelButton.hidden=false;keyInput.disabled=true;folderInput.disabled=true;
    const lockIds=['processBtn','processNoBgBtn','resetAllBtn','clearBtn','downloadAllBtn','downloadOriginalBtn','downloadTeamsBtn','downloadEachBtn','fileInput'];
    const locked=lockIds.map(id=>{const element=document.getElementById(id);const disabled=element.disabled;element.disabled=true;return {element,disabled};});
    progress.hidden=false;progress.removeAttribute('value');
    const imported=[];const failed=[];let cancelled=false;
    try {
      message('Đang đọc danh sách logo trên Google Drive…');
      const files=await listImages(folder,apiKey,run.signal);
      if(!files.length) {message('Không có ảnh trong thư mục này. Chỉ đọc ảnh trực tiếp, không đọc thư mục con.');return;}
      progress.max=files.length;progress.value=0;
      for(let i=0;i<files.length;i++) {
        if(run.signal.aborted) {cancelled=true;break;}
        message('Đang tải ' + (i+1) + '/' + files.length + ': ' + files[i].name);
        try {imported.push(await downloadImage(files[i],run.signal));}
        catch(error) {if(run.signal.aborted) {cancelled=true;break;} failed.push(files[i].name + ': ' + error.message);}
        progress.value=i+1;
      }
      if(imported.length) addFiles(imported);
      message((cancelled?'Đã hủy. ':'') + 'Đã nạp ' + imported.length + '/' + files.length + ' logo, giữ nguyên tên team. '
        + (imported.length?'Bấm TÁCH NỀN hoặc KHÔNG TÁCH NỀN để chỉnh sửa. ':'')
        + (failed.length?'Có ' + failed.length + ' ảnh chưa tải được:\n' + failed.join('\n'):''));
    } catch(error) {message(run.signal.aborted?'Đã hủy nạp logo.':error.message);}
    finally {
      controller=null;loadButton.disabled=false;cancelButton.hidden=true;keyInput.disabled=false;folderInput.disabled=false;
      progress.hidden=true;locked.forEach(({element,disabled})=>{element.disabled=disabled;});
    }
  };
  if(isLocal) fetch('/api/drive-config').then(r=>r.ok?r.json():{}).then(config=>{
    if(config.apiKey && !keyInput.value) keyInput.value=config.apiKey;
  }).catch(()=>{});
})();
