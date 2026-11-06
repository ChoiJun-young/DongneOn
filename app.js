let mapLoading=true;
let client=null,sessionUser=null,cloudChannel=null,roomSeq=0;
const config=window.DONGNEON_CONFIG||{};
const cloudEnabled=Boolean(config.supabaseUrl&&config.supabasePublicKey);

const topics=[];const $=id=>document.getElementById(id);let selected={id:0,isLocal:true,name:"장소를 선택해주세요",address:"",category:"선택 대기",lat:36.4,lon:127.8,reason:"내 동네를 확인하고 있어요. 위치를 허용하거나 지역을 직접 검색해주세요.",keywords:[]},origin=null,map,routeLine,userMarker,requestId=0;let routeController=null;const markers=[];const storage={get(k,f){try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch{return false}}};let user=storage.get('dongneon-user','');let messages=storage.get('dongneon-messages',[]);if(!Array.isArray(messages))messages=[];let channel;try{channel=new BroadcastChannel('dongneon-chat');channel.onmessage=e=>{if(!cloudEnabled&&e.data==='refresh'){messages=storage.get('dongneon-messages',[]);renderChat()}}}catch{}
function toast(text){$('toast').textContent=text;$('toast').classList.remove('hidden');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').classList.add('hidden'),4500)}
function initMap(){if(!window.L){fallbackMap(selected);return}$('map').replaceChildren();document.querySelector('.maplabel').textContent='● 위치를 허용하거나 지역을 검색해주세요';map=L.map('map').setView([36.4,127.8],7);let tileLoads=0,tileErrors=0;const tiles=L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',maxZoom:19}).addTo(map);tiles.on('tileload',()=>tileLoads++);tiles.on('tileerror',()=>{if(++tileErrors>=4&&tileLoads===0&&map){map.remove();map=null;routeLine=null;userMarker=null;markers.length=0;fallbackMap(selected);toast('지도 타일을 불러오지 못해 대체 지도로 전환했습니다.')}});topics.slice(0,10).forEach(t=>{let m=L.marker([t.lat,t.lon],{icon:L.divIcon({className:'',html:'<div class="mapnumber">'+t.id+'</div>',iconSize:[29,29]})}).addTo(map).bindTooltip(t.name);m.on('click',()=>selectTopic(t));markers.push(m)});}
function renderRanking(){const q=$('search').value.trim();$('ranking').replaceChildren();topics.slice(0,10).filter(t=>t.name.includes(q)).forEach(t=>{const b=document.createElement('button');b.className='row'+(t.id===selected.id?' selected':'');b.setAttribute('aria-pressed',t.id===selected.id);b.innerHTML='<span class="rank">'+t.id+'</span><span class="topic">'+t.name+(t.badge?'<span class="pill">'+t.badge+'</span>':'')+'<div class="category">'+t.category+'</div></span><span class="change '+(t.change.includes('▼')?'down':t.change==='NEW'?'new':'')+'">'+t.change+'</span>';b.onclick=()=>selectTopic(t);$('ranking').append(b)});if(!$('ranking').children.length){const p=document.createElement('p');p.className='footnote';p.textContent='아직 집계된 활동이 없습니다. 위치를 허용하거나 동네를 검색해주세요.';$('ranking').append(p)}}
function selectTopic(t){selected=t;roomSeq++;renderRanking();$('detailName').textContent=t.name;$('detailCategory').textContent=t.isLocal?t.category+' / 장소 검색 결과':t.category+' / 예시 '+t.id+'위';$('reason').textContent=t.reason;$('keywords').replaceChildren();t.keywords.forEach(k=>{const s=document.createElement('span');s.className='chip';s.textContent='#'+k;$('keywords').append(s)});$('routeTitle').textContent=t.name+' 가는 길';const q=encodeURIComponent(t.name);$('kakao').href='https://map.kakao.com/link/to/'+q+','+t.lat+','+t.lon;$('naver').href='https://map.naver.com/p/search/'+q;if(map){map.panTo([t.lat,t.lon]);(t.isLocal?placeMarkers.get(t.id):markers[t.id-1])?.openTooltip()}else if(mapLoading){$('map').textContent='지도를 불러오는 중…'}else{fallbackMap(t)}renderChat();if(cloudEnabled&&client)loadRoom();updateRoute();loadRelatedContent(t)}
function kmBetween(a,b){const rad=x=>x*Math.PI/180,dlat=rad(b.lat-a.lat),dlon=rad(b.lon-a.lon),v=Math.sin(dlat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dlon/2)**2;return 6371*2*Math.atan2(Math.sqrt(v),Math.sqrt(1-v))}
async function updateRoute(){const seq=++requestId;if(routeController)routeController.abort();if(routeLine&&map){map.removeLayer(routeLine);routeLine=null}$('distance').textContent=$('drive').textContent=$('walk').textContent='—';$('distanceLabel').textContent='자동차 거리';if(!origin){$('routeStatus').textContent='내 위치를 허용하면 자동차 경로를 조회합니다.';$('routeBadge').textContent='출발지 미설정';return}const t=selected,d=kmBetween(origin,t);$('walk').textContent=Math.max(1,Math.round(d/4*60))+'분';$('routeStatus').textContent='자동차 경로를 조회하고 있어요…';$('routeBadge').textContent='경로 조회 중';if(map)map.fitBounds([[origin.lat,origin.lon],[t.lat,t.lon]],{padding:[45,45],maxZoom:16});if(d>300){$('routeStatus').textContent='출발지와 목적지가 300km 이상 떨어져 있어 자동차 경로 조회를 생략합니다.';$('routeBadge').textContent='다른 지역';return}routeController=new AbortController();const activeController=routeController;const timeout=setTimeout(()=>activeController.abort(),12000);try{const res=await fetch('https://router.project-osrm.org/route/v1/driving/'+origin.lon+','+origin.lat+';'+t.lon+','+t.lat+'?overview=full&geometries=geojson',{signal:activeController.signal});if(!res.ok)throw Error();const body=await res.json();if(seq!==requestId)return;const r=body.routes?.[0];if(!r)throw Error();$('distance').textContent=(r.distance/1000).toFixed(1)+'km';$('drive').textContent=Math.max(1,Math.round(r.duration/60))+'분';$('routeBadge').textContent='자동차 경로';$('routeStatus').textContent='내 위치 → '+t.name+' · 실시간 교통을 반영하지 않은 추정치';if(map){routeLine=L.geoJSON(r.geometry,{style:{color:'#087b60',weight:5,opacity:.85}}).addTo(map);map.fitBounds(routeLine.getBounds(),{padding:[40,40]})}}catch{if(seq!==requestId)return;$('routeBadge').textContent='경로 조회 실패';$('routeStatus').textContent='자동차 경로를 불러오지 못했어요. 지도 앱에서 길찾기를 이용해 주세요. 선형 경로를 임의로 표시하지 않습니다.'}finally{clearTimeout(timeout)}}
$('locate').onclick=()=>{if(!navigator.geolocation){toast('이 브라우저는 위치 기능을 지원하지 않습니다.');return}$('locate').disabled=true;$('locate').textContent='위치 확인 중…';navigator.geolocation.getCurrentPosition(p=>{origin={lat:p.coords.latitude,lon:p.coords.longitude};$('locationLabel').textContent='내 위치가 길찾기 출발지로 적용됐어요 · 지역 검색은 직접 입력해주세요';if(map){if(userMarker)map.removeLayer(userMarker);userMarker=L.circleMarker([origin.lat,origin.lon],{radius:8,color:'#fff',weight:3,fillColor:'#3478c4',fillOpacity:1}).addTo(map).bindTooltip('내 위치')}restoreLocate();updateRoute()},e=>{restoreLocate();toast(e.code===1?'위치 권한이 거부됐습니다. 브라우저 권한 설정 또는 HTTPS 실행을 확인해 주세요.':'위치를 확인할 수 없어요. 잠시 후 다시 시도해 주세요.')},{enableHighAccuracy:false,timeout:12000,maximumAge:60000})};function restoreLocate(){$('locate').disabled=false;$('locate').textContent='◎ 내 위치 사용'}
$('reset').onclick=()=>{origin=null;if(userMarker&&map){map.removeLayer(userMarker);userMarker=null}$('locationLabel').textContent='서울 성수 · 예시 탐색 중심 / 내 위치는 아직 사용하지 않아요';selectTopic(topics[0]);if(map)map.setView([36.4,127.8],7)};
function renderChat(){
 if(selected.isLocal){$('chatlog').textContent='검색 장소의 대화방은 준비 중입니다. 성수 예시 대화방과 연결되지 않습니다.';return;}
 $('chatlog').replaceChildren();const list=messages.filter(m=>m.topic===selected.id).slice(-60);
 if(!list.length){const p=document.createElement('p');p.className='muted';p.textContent=cloudEnabled?'아직 대화가 없어요. 이메일 인증 후 첫 이야기를 남겨보세요.':'아직 대화가 없어요. 닉네임 체험으로 이야기를 남겨보세요.';$('chatlog').append(p)}
 list.forEach(m=>{const row=document.createElement('div');row.className='message';const name=document.createElement('b');name.textContent=m.user+' · '+new Date(m.time).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'});const text=document.createElement('span');text.textContent=m.text;row.append(name,text);$('chatlog').append(row)});$('chatlog').scrollTop=$('chatlog').scrollHeight;
}
function showUser(){$('login').textContent=cloudEnabled?(sessionUser?'로그아웃':'이메일로 로그인'):(user?user+' · 로그아웃':'체험 ID 만들기')}
$('login').onclick=async()=>{if(cloudEnabled){if(!client){toast('서버 연결이 완료되지 않았습니다. 설정과 네트워크를 확인해 주세요.');return}if(sessionUser){const {error}=await client.auth.signOut();if(error){toast('로그아웃 실패: 다시 시도해 주세요.');return}sessionUser=null;showUser();return}$('loginDialog').showModal()}else if(user){user='';storage.set('dongneon-user','');showUser()}else $('loginDialog').showModal()};
$('cancelLogin').onclick=()=>$('loginDialog').close();
$('sendOtp').onclick=async()=>{const email=$('email').value.trim(),nickname=$('nickname').value.trim();if(!email||!$('email').checkValidity()||nickname.length<2){toast('닉네임과 올바른 이메일을 입력해 주세요.');return}if(!client)return;$('sendOtp').disabled=true;try{const {error}=await client.auth.signInWithOtp({email,options:{data:{nickname}}});if(error)throw error;toast('인증코드를 발송했습니다. 이메일함과 스팸함을 확인해 주세요.')}catch{toast('코드 발송 실패: 이메일 설정·발송 한도를 확인해 주세요.')}finally{$('sendOtp').disabled=false}};
$('loginForm').onsubmit=async e=>{e.preventDefault();const val=$('nickname').value.trim();if(val.length<2){toast('닉네임은 2자 이상 입력해 주세요.');return}if(!cloudEnabled){user=val;storage.set('dongneon-user',user);showUser();$('loginDialog').close();return}if(!client){toast('서버 연결 실패: config.js를 확인해 주세요.');return}const email=$('email').value.trim(),token=$('otp').value.trim();if(!email||!token){toast('이메일 인증코드를 받아 입력해 주세요.');return}$('authSubmit').disabled=true;try{const {data,error}=await client.auth.verifyOtp({email,token,type:'email'});if(error)throw error;sessionUser=data.user;const result=await client.auth.updateUser({data:{nickname:val}});if(result.error)toast('로그인 완료. 닉네임 변경은 반영되지 않았습니다.');$('loginDialog').close();$('otp').value='';showUser();await loadRoom()}catch{toast('인증 실패: 이메일과 코드·만료 여부를 확인해 주세요.')}finally{$('authSubmit').disabled=false}};
$('chatForm').onsubmit=async e=>{e.preventDefault();if(selected.isLocal){toast('검색 장소의 대화방은 아직 준비 중입니다.');return;}const text=$('chatText').value.trim();if(!text)return;if(cloudEnabled){if(!client){toast('서버 미연결로 메시지를 전송할 수 없습니다.');return}if(!sessionUser){$('loginDialog').showModal();return}const button=$('chatForm').querySelector('button');button.disabled=true;try{const {error}=await client.from('messages').insert({topic_id:selected.id,body:text.slice(0,300)});if(error)throw error;$('chatText').value='';await loadRoom()}catch{toast('전송 실패: 연결 상태 또는 3초 전송 간격을 확인해 주세요.')}finally{button.disabled=false}return}if(!user){$('loginDialog').showModal();return}messages=storage.get('dongneon-messages',messages);messages.push({topic:selected.id,user,text:text.slice(0,300),time:Date.now()});messages=messages.slice(-500);if(!storage.set('dongneon-messages',messages))toast('메시지를 브라우저에 저장하지 못했습니다.');$('chatText').value='';renderChat();channel?.postMessage('refresh')};
window.addEventListener('storage',e=>{if(!cloudEnabled&&e.key==='dongneon-messages'){messages=storage.get('dongneon-messages',[]);renderChat()}});
function tab(name){document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));$('trend').classList.toggle('hidden',name!=='trend');$('empty').classList.toggle('hidden',name==='trend');$('emptyTitle').textContent=({news:'동네소식',info:'정보',market:'중고거래'})[name]+' · 준비 중';if(name==='trend'&&map)setTimeout(()=>map.invalidateSize(),50)}document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>tab(b.dataset.tab));$('back').onclick=()=>tab('trend');$('search').oninput=renderRanking;$('about').onclick=()=>$('aboutDialog').showModal();$('closeAbout').onclick=()=>$('aboutDialog').close();

function fallbackMap(t){const box=$('map');box.replaceChildren();const frame=document.createElement('iframe');frame.className='map-fallback';frame.title=t.name+' OpenStreetMap 대체 지도';frame.referrerPolicy='no-referrer';const bbox=[t.lon-.018,t.lat-.012,t.lon+.018,t.lat+.012].join(',');frame.src='https://www.openstreetmap.org/export/embed.html?bbox='+encodeURIComponent(bbox)+'&layer=mapnik&marker='+t.lat+'%2C'+t.lon;box.append(frame);const label=document.querySelector('.maplabel');label.textContent='대체 지도 · 선택한 장소 표시 / 경로 선은 지원하지 않아요';$('routeStatus').textContent='대화형 지도 로딩 실패로 대체 지도를 표시합니다. 아래 지도 앱 링크도 사용할 수 있어요.'}
function loadScript(url){return new Promise((resolve,reject)=>{const el=document.createElement('script');let done=false;const timer=setTimeout(()=>{done=true;el.remove();reject(new Error('timeout'))},7000);el.src=url;el.onload=()=>{clearTimeout(timer);if(!done)resolve()};el.onerror=()=>{clearTimeout(timer);if(!done)reject(new Error('load failed'))};document.head.append(el)})}
async function loadLibrary(paths,ready){if(ready())return true;for(const url of paths){try{await loadScript(url);if(ready())return true}catch{}}return false}
async function loadRoom(){if(selected.isLocal||!client)return;const id=selected.id,seq=++roomSeq;try{const {data,error}=await client.from('messages').select('id,topic_id,nickname,body,created_at').eq('topic_id',id).order('created_at',{ascending:false}).limit(60);if(selected.isLocal||seq!==roomSeq||id!==selected.id)return;if(error)throw error;messages=data.reverse().map(m=>({topic:m.topic_id,user:m.nickname,text:m.body,time:m.created_at}));renderChat()}catch{if(seq!==roomSeq)return;messages=[];renderChat();$('chatlog').textContent='채팅을 불러오지 못했습니다. 데이터베이스 설정을 확인해 주세요.'}}
async function bootCloud(){if(!cloudEnabled){$('chatMode').textContent='로컬 체험';showUser();return}$('chatMode').textContent='서버 연결 중';$('cloudAuth').classList.remove('hidden');$('email').required=true;$('otp').required=true;$('authSubmit').textContent='인증코드로 로그인';$('authHelp').textContent='닉네임·이메일을 입력해 인증코드를 받으세요. 이메일 계정 인증으로 여러 사용자가 같은 대화방에 참여합니다.';messages=[];renderChat();showUser();const loaded=await loadLibrary(['https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js','https://unpkg.com/@supabase/supabase-js@2/dist/umd/supabase.js'],()=>!!window.supabase);if(!loaded){$('chatMode').textContent='서버 로딩 실패';toast('인증 라이브러리를 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.');return}try{client=window.supabase.createClient(config.supabaseUrl,config.supabasePublicKey);const {data,error}=await client.auth.getSession();if(error)throw error;sessionUser=data.session?.user??null;showUser();client.auth.onAuthStateChange((_event,session)=>{sessionUser=session?.user??null;showUser()});cloudChannel=client.channel('dongneon-messages').on('postgres_changes',{event:'INSERT',schema:'public',table:'messages'},payload=>{if(payload.new.topic_id===selected.id)loadRoom()}).subscribe(status=>{$('chatMode').textContent=status==='SUBSCRIBED'?'공유 채팅':status==='CHANNEL_ERROR'||status==='TIMED_OUT'?'재연결 중':'연결 중'});await loadRoom();setInterval(()=>{if(!document.hidden)loadRoom()},15000)}catch{$('chatMode').textContent='설정 확인 필요';toast('Supabase 연결 실패: 주소와 공개 키를 확인해 주세요.')}}
async function bootMap(){mapLoading=true;const style=document.createElement('link');style.rel='stylesheet';style.href='https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css';style.onerror=()=>{style.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';style.onerror=null};document.head.append(style);const loaded=await loadLibrary(['https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js','https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'],()=>!!window.L);if(loaded){try{initMap();mapLoading=false;selectTopic(selected);return}catch{if(map){map.remove();map=null}markers.length=0;}}mapLoading=false;fallbackMap(selected)}



// 뉴스·블로그를 하나의 처리 흐름으로 관리합니다. 실제 순위 산정에는 사용하지 않습니다.
const contentCache = new Map();
let contentGeneration = 0;
let contentControllers = [];

function contentText(value) {
  const doc = new DOMParser().parseFromString(String(value || ''), 'text/html');
  return doc.body.textContent || '';
}
function contentUrl(value) {
  try { const u = new URL(value); return ['http:', 'https:'].includes(u.protocol) ? u.href : null; }
  catch { return null; }
}
function ensureContentAreas() {
  const news = $('sources');
  const section = news.closest('section');
  section.querySelector('h3').textContent = '관련 뉴스';
  section.querySelector('p').textContent = '키워드 검색 결과이며 지역과 무관한 글이 포함될 수 있습니다. 순위 산정 근거가 아닙니다.';
  if (!$('blogResults')) {
    const blogSection = document.createElement('section');
    blogSection.className = 'section';
    const heading = document.createElement('h3'); heading.textContent = '관련 블로그';
    const note = document.createElement('p'); note.className = 'muted';
    note.textContent = '광고·협찬 또는 지역과 무관한 글이 포함될 수 있습니다. 순위 산정 근거가 아닙니다.';
    const list = document.createElement('div'); list.id = 'blogResults';
    blogSection.append(heading, note, list); section.after(blogSection);
  }
}
function contentStatus(container, text) {
  container.replaceChildren(); const p=document.createElement('p');p.className='muted';p.textContent=text;container.append(p);
}
function paintContent(container, items, type) {
  container.replaceChildren();
  const seen = new Set();
  items.forEach(item => {
    const url = contentUrl(item.originallink) || contentUrl(item.link);
    if (!url || seen.has(url)) return;
    seen.add(url);
    const row=document.createElement('div');row.style.padding='10px 0';row.style.borderBottom='1px solid #e2e9e5';
    const a=document.createElement('a');a.className='source';a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.style.fontWeight='700';a.textContent=contentText(item.title)+' ↗';
    const meta=document.createElement('p');meta.className='muted';
    if(type==='news') {
      const date=new Date(item.pubDate);meta.textContent=Number.isNaN(date.getTime())?'발행일 정보 없음':date.toLocaleString('ko-KR');
    } else {
      const d=String(item.postdate||'');
      meta.textContent=contentText(item.bloggername||'블로그')+' · '+(/^\d{8}$/.test(d)?d.slice(0,4)+'.'+d.slice(4,6)+'.'+d.slice(6,8):'작성일 정보 없음');
    }
    const summary=document.createElement('p');summary.className='muted';summary.textContent=contentText(item.description);
    row.append(a,meta,summary);container.append(row);
  });
  if(!container.children.length)contentStatus(container,'표시할 검색 결과가 없습니다.');
}
async function fetchContent(topic, type, generation) {
  const container=$(type==='news'?'sources':'blogResults');
  const key=type+':'+topic.name;
  contentStatus(container,'불러오는 중…');
  const controller=new AbortController();contentControllers.push(controller);
  const timer=setTimeout(()=>controller.abort(),12000);
  try {
    const params=new URLSearchParams({type,q:topic.name});
    const response=await fetch('/api/search?'+params,{signal:controller.signal});
    const data=await response.json();
    if(!response.ok||!Array.isArray(data.items))throw new Error('Invalid response');
    if(generation!==contentGeneration||selected.id!==topic.id)return;
    paintContent(container,data.items,type);
  } catch {
    if(generation!==contentGeneration||selected.id!==topic.id)return;
    contentStatus(container,'검색 결과를 불러오지 못했습니다. ');
    const retry=document.createElement('button');retry.type='button';retry.textContent='다시 시도';
    retry.onclick=()=>{if(generation===contentGeneration)fetchContent(topic,type,generation)};
    container.append(retry);
  } finally {clearTimeout(timer);}
}
function loadRelatedContent(topic) {
  ensureContentAreas();const generation=++contentGeneration;
  contentControllers.forEach(c=>c.abort());contentControllers=[];
  fetchContent(topic,'news',generation);fetchContent(topic,'blog',generation);
}


// 지역 장소 검색: 예시 순위와 분리하며 장소 검색을 인기순위로 표시하지 않습니다.
let placeResults=[];
let placeMode=false;
let placeRequest=0;
let placeController=null;
const placeMarkers=new Map();
function decodePlace(item,index,query){
 const lon=Number(item.mapx)/10000000,lat=Number(item.mapy)/10000000;
 if(!Number.isFinite(lat)||!Number.isFinite(lon)||lat<33||lat>39.5||lon<124||lon>132)return null;
 const name=contentText(item.title).trim();if(!name)return null;
 return {id:-(index+1),isLocal:true,name,lat,lon,category:contentText(item.category||'장소'),address:contentText(item.roadAddress||item.address||''),website:contentUrl(item.link),keywords:[],reason:'장소 검색 결과입니다. 인기순위·급상승·방문 추천을 의미하지 않습니다.',query};
}
function clearPlaceMarkers(){placeMarkers.forEach(marker=>{if(map)map.removeLayer(marker)});placeMarkers.clear()}
function syncPlaceMarkers(){
 clearPlaceMarkers();if(!map)return;
 markers.forEach(marker=>{if(placeMode)map.removeLayer(marker);else marker.addTo(map)});
 if(!placeMode){document.querySelector('.maplabel').textContent='● 위치를 허용하거나 지역을 검색해주세요';return;}
 placeResults.forEach((t,i)=>{const marker=L.marker([t.lat,t.lon],{icon:L.divIcon({className:'',html:'<div class="mapnumber">'+(i+1)+'</div>',iconSize:[29,29]})}).addTo(map).bindTooltip(t.name);marker.on('click',()=>selectTopic(t));placeMarkers.set(t.id,marker)});
 document.querySelector('.maplabel').textContent='● 장소 검색 결과 '+placeResults.length+'곳 · 인기순위 아님';
 if(placeResults.length)map.fitBounds(placeResults.map(t=>[t.lat,t.lon]),{padding:[40,40],maxZoom:16});
}
const originalRenderRanking=renderRanking;
renderRanking=function(){
 if(!placeMode){originalRenderRanking();return;}
 const list=$('ranking');list.replaceChildren();const q=$('search').value.trim();
 placeResults.filter(t=>t.name.includes(q)||t.address.includes(q)).forEach(t=>{
  const b=document.createElement('button');b.className='row'+(selected.id===t.id?' selected':'');b.setAttribute('aria-pressed',String(selected.id===t.id));
  const text=document.createElement('span');text.className='topic';text.textContent=t.name;
  const address=document.createElement('div');address.className='category';address.textContent=t.address;text.append(address);b.append(text);b.onclick=()=>selectTopic(t);list.append(b);
 });
 if(!list.children.length){const text=document.createElement('p');text.className='footnote';text.textContent='표시할 장소가 없습니다.';list.append(text);}
};
const coreSelectTopic=selectTopic;
selectTopic=function(t){
 coreSelectTopic(t);
 $('chatText').disabled=!!t.isLocal;$('chatForm').querySelector('button').disabled=!!t.isLocal;
 if(t.isLocal){$('reason').textContent=t.reason+' '+t.address;
  $('keywords').replaceChildren();
  if(t.website){const a=document.createElement('a');a.textContent='장소 홈페이지 ↗';a.href=t.website;a.target='_blank';a.rel='noopener noreferrer';$('keywords').append(a);}
 }
};
function setPlaceLabels(active){
 const panel=document.querySelector('.ranking');panel.querySelector('h2').textContent=active?'지역 장소 검색 결과':'지금 뜨는 TOP 10';
 panel.querySelector('.live').textContent=active?'SEARCH':'24H';
 panel.querySelector('.panel-head p').textContent=active?'API 검색 결과 최대 5곳 · 인기순위 아님':'최근 24시간 동네온 대화 참여 기준 · 검색량 순위 아님';
 panel.querySelector('.footnote')?.remove();
 const note=document.createElement('div');note.className='footnote';note.textContent=active?'검색 결과 순서는 지역 인기·화제 순위가 아닙니다. 장소 대화방은 준비 중입니다.':'아직 집계된 활동이 없습니다.';panel.append(note);
 $('search').placeholder=active?'검색된 장소 안에서 찾기':'TOP 10 안에서 키워드 찾기';$('search').value='';
}
async function searchPlaces(e){
 e.preventDefault();const query=$('placeQuery').value.trim();if(query.length<2||query.length>80){toast('지역과 검색어를 2~80자로 입력해주세요.');return;}
 const seq=++placeRequest;if(placeController)placeController.abort();const controller=new AbortController();placeController=controller;
 $('placeSearchButton').disabled=true;$('placeSearchStatus').textContent='장소를 검색하는 중…';
 const timer=setTimeout(()=>controller.abort(),12000);
 try{
  const response=await fetch('/api/search?'+new URLSearchParams({type:'local',q:query}),{signal:controller.signal});const data=await response.json();
  if(seq!==placeRequest)return;if(!response.ok||!Array.isArray(data.items))throw Error();
  const seen=new Set();const results=data.items.map((x,i)=>decodePlace(x,i,query)).filter(t=>{if(!t)return false;const key=t.name+':'+t.address;if(seen.has(key))return false;seen.add(key);return true});
  if(!results.length){$('placeSearchStatus').textContent='표시할 장소가 없습니다. 지역명과 업종을 구체적으로 입력해주세요. 기존 화면은 유지됩니다.';return;}
  placeResults=results;placeMode=true;roomSeq++;setPlaceLabels(true);syncPlaceMarkers();selectTopic(results[0]);
  if(map)map.fitBounds(results.map(t=>[t.lat,t.lon]),{padding:[40,40],maxZoom:16});
  $('locationLabel').textContent='장소 검색: '+query+' · 검색 결과는 인기순위가 아닙니다';
  $('placeSearchStatus').textContent=results.length+'곳 표시 · 검색어와 무관하거나 지정 지역 밖 장소가 포함될 수 있습니다. 주소를 확인하세요.';
 }catch{if(seq===placeRequest)$('placeSearchStatus').textContent='장소 검색 실패. 검색 서버 또는 네트워크를 확인하고 다시 시도해주세요.';}
 finally{clearTimeout(timer);if(seq===placeRequest)$('placeSearchButton').disabled=false;}
}
function restoreDemo(){return;}
function installPlaceSearch(){
 const box=document.createElement('section');box.className='panel';box.style.cssText='margin:0 24px 16px;padding:16px';
 const h=document.createElement('h2');h.textContent='다른 동네 장소 찾아보기';
 const form=document.createElement('form');form.style.cssText='display:flex;gap:8px;flex-wrap:wrap';
 const input=document.createElement('input');input.id='placeQuery';input.type='search';input.minLength=2;input.maxLength=80;input.required=true;input.placeholder='예: 서울 마포구 연남동 카페';input.setAttribute('aria-label','지역과 장소 검색어');input.style.cssText='flex:1;min-width:180px;padding:10px;border:1px solid #e2e9e5;border-radius:9px';
 const button=document.createElement('button');button.id='placeSearchButton';button.type='submit';button.className='primary';button.textContent='장소 검색';
 const reset=document.createElement('button');reset.type='button';reset.textContent='';reset.hidden=true;
 form.append(input,button,reset);form.onsubmit=searchPlaces;
 const status=document.createElement('p');status.id='placeSearchStatus';status.className='muted';status.setAttribute('role','status');status.textContent='지역명과 찾을 장소를 함께 입력하세요. 검색 결과는 인기순위가 아닙니다.';
 box.append(h,form,status);document.querySelector('.workspace').before(box);
 $('reset').onclick=restoreDemo;$('search').oninput=()=>renderRanking();
}
const coreInitMap=initMap;initMap=function(){coreInitMap();syncPlaceMarkers();};
installPlaceSearch();showUser();renderRanking();bootMap();bootCloud();

// 위치는 이 조회에만 사용하며 저장하지 않습니다.
$('locate').onclick=async()=>{
 if(!navigator.geolocation){toast('위치 기능을 지원하지 않는 브라우저입니다.');return;}
 $('locate').disabled=true;$('locate').textContent='동네 확인 중…';
 try{
  const position=await new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:false,timeout:12000,maximumAge:60000}));
  origin={lat:position.coords.latitude,lon:position.coords.longitude};
  if(map){if(userMarker)map.removeLayer(userMarker);userMarker=L.circleMarker([origin.lat,origin.lon],{radius:8,color:'#fff',weight:3,fillColor:'#3478c4',fillOpacity:1}).addTo(map).bindTooltip('내 위치');map.setView([origin.lat,origin.lon],15);}
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),10000);
  let response,data;
  try{response=await fetch('/api/region?'+new URLSearchParams({lat:origin.lat,lon:origin.lon}),{signal:controller.signal});data=await response.json();}finally{clearTimeout(timer);}
  if(!response.ok||!data.name)throw new Error(data.error||'동네 조회 실패');
  window.dispatchEvent(new CustomEvent('dongneon-region-resolved',{detail:{name:data.name}}));
  $('locationLabel').textContent='현재 동네: '+data.name+' · 주변 카페 검색 중';
  $('placeQuery').value=data.name+' 카페';
  await searchPlaces({preventDefault(){}});
  $('locationLabel').textContent='현재 동네: '+data.name+' · 카페 검색 결과 / 인기순위 아님';
  toast('내 동네 이름으로 카페를 검색했습니다. 장소 주소도 확인해주세요.');
 }catch(e){
  $('locationLabel').textContent=origin?'내 위치 확인됨 · 동네 자동 검색 실패. 지역명을 직접 입력해주세요.':'위치 확인 실패 · 지역명을 직접 입력해주세요.';
  toast(e.code===1?'위치 권한을 허용해주세요.':e.message||'위치를 확인할 수 없습니다.');
 }finally{restoreLocate();}
};

// 장소별 공유 대화방. 기존 예시 메시지와 별도 저장합니다.
const demoLoadRoom=loadRoom, demoRenderChat=renderChat;
const demoChatSubmit=$('chatForm').onsubmit;
let communityRows=[],communityLoading=false,communityError='',communityRoom=null;
function placeIdentity(t){return (t.name+'|'+t.address).normalize('NFKC').replace(/\s+/g,' ').trim().slice(0,400);}
async function findCommunityRoom(t,create){
 // 외부 검색 결과로 신규 장소를 저장하지 않습니다. 기존 방만 조회합니다.
 const key=placeIdentity(t);
 const result=await client.from('community_places').select('id').eq('place_key',key).maybeSingle();
 if(result.error)throw result.error;
 if(result.data)return result.data.id;
 if(create){const error=new Error('신규 장소 대화방 생성이 일시 중단되었습니다.');error.code='PLACE_CREATION_PAUSED';throw error;}
 return null;
}

renderChat=function(){
 if(!selected.isLocal){demoRenderChat();return;}
 const box=$('chatlog');box.replaceChildren();
 const p=document.createElement('p');p.className='muted';
 p.textContent=communityError|| (communityLoading?'장소 대화방을 불러오는 중…':communityRows.length?'장소별 공유 대화 · 15초마다 새로 확인합니다.':'아직 대화가 없어요. 로그인 후 첫 이야기를 남겨보세요.');box.append(p);
 communityRows.forEach(m=>{const row=document.createElement('div');row.className='message';const name=document.createElement('b');name.textContent='동네 참여자 · '+new Date(m.created_at).toLocaleString('ko-KR');const text=document.createElement('span');text.textContent=m.body;row.append(name,text);box.append(row);});
 box.scrollTop=box.scrollHeight;
};
loadRoom=async function(){
 if(!selected.isLocal)return demoLoadRoom();
 if(!client)return;
 const t=selected,seq=++roomSeq;
 try{
  const id=await findCommunityRoom(t,false);
  if(seq!==roomSeq||selected!==t)return;
  let rows=[];
  if(id){const result=await client.from('community_messages').select('id,place_id,body,created_at').eq('place_id',id).order('created_at',{ascending:false}).limit(60);if(result.error)throw result.error;rows=result.data.reverse();}
  if(seq!==roomSeq||selected!==t)return;
  communityRoom=id;communityRows=rows;communityLoading=false;communityError='';renderChat();
 }catch{if(seq!==roomSeq||selected!==t)return;communityLoading=false;communityError='대화방 조회 실패. 잠시 후 다시 선택해주세요.';renderChat();}
};
const communitySelect=selectTopic;
selectTopic=function(t){
 communityRows=[];communityRoom=null;communityLoading=!!t.isLocal;communityError='';
 communitySelect(t);
 if(t.isLocal){$('chatText').disabled=false;$('chatForm').querySelector('button').disabled=false;renderChat();}
};
$('chatForm').onsubmit=async e=>{
 if(!selected.isLocal)return demoChatSubmit(e);
 e.preventDefault();
 if(!client){toast('서버 연결을 기다려주세요.');return;}
 if(!sessionUser){$('loginDialog').showModal();return;}
 const t=selected,text=$('chatText').value.trim().slice(0,300);if(!text)return;
 const button=$('chatForm').querySelector('button');button.disabled=true;
 try{
  const id=await findCommunityRoom(t,true);
  const result=await client.from('community_messages').insert({place_id:id,body:text});if(result.error)throw result.error;
  if(selected===t){$('chatText').value='';await loadRoom();}
 }catch{toast('전송되지 않았습니다. 신규 장소 대화방 생성은 일시 중단 중입니다. 기존 방이라면 로그인 상태와 3초 전송 간격을 확인해주세요.');}
 finally{button.disabled=false;}
};
const communityLabels=setPlaceLabels;
setPlaceLabels=function(active){communityLabels(active);if(active)document.querySelector('.ranking .footnote').textContent='검색 결과는 인기순위가 아닙니다. 장소별 대화는 로그인 후 참여할 수 있습니다.';};
if(selected.isLocal)selectTopic(selected);

// 実測: 近隣の直近24時間チャット順位（検索順位ではありません）。
let communityRankMode=false,communityRankSeq=0;
const rankPanel=document.createElement('section');rankPanel.className='panel';rankPanel.style.cssText='margin:0 24px 16px;padding:16px';
const rankTitle=document.createElement('h2');rankTitle.textContent='내 주변 대화 인기순위';
const rankNote=document.createElement('p');rankNote.className='muted';
const rankMode=document.createElement('select');rankMode.setAttribute('aria-label','순위 집계 방식');rankMode.style.cssText='padding:10px;margin-right:8px';
[['history','순위 변동 보기 · 로그인 필요'],['live','현재 활동 보기 · 내 위치 중심']].forEach(([value,text])=>{const o=document.createElement('option');o.value=value;o.textContent=text;rankMode.append(o);});
const rankButton=document.createElement('button');rankButton.className='primary';rankButton.textContent='인기순위 조회';
const rankStatus=document.createElement('p');rankStatus.className='muted';rankStatus.setAttribute('role','status');rankStatus.textContent='먼저 내 위치 사용을 눌러주세요. 방식 변경 후 조회 버튼을 눌러 적용하세요.';
function explainRankMode(){rankNote.textContent=rankMode.value==='history'?'변동 순위: 약 0.05도 격자 중심 반경 10km · 행정동 경계 아님 · 시간당 첫 요청 시 저장 · 직전 저장분과 비교 · 최대 100곳 중 10곳 표시. 집계 구역 중심은 저장되지만 사용자 원본 좌표는 저장하지 않습니다.':'현재 활동: 내 위치 중심 반경 10km · 최근 24시간 참여 계정 수, 메시지 수, 최근 활동순 · 조회 시 계산 · 최대 100곳 중 10곳 표시. 순위 변동은 표시하지 않습니다.';}
rankMode.onchange=explainRankMode;explainRankMode();
rankPanel.append(rankTitle,rankNote,rankMode,rankButton,rankStatus);document.querySelector('.workspace').before(rankPanel);
const rankingBaseLabels=setPlaceLabels;
setPlaceLabels=function(active){communityRankMode=false;rankingBaseLabels(active);};
function movementLabel(t){
 if(!t.history)return '';
 if(t.movement==='FIRST')return '첫 집계';
 if(t.movement==='NEW')return 'NEW';
 if(t.movement==='UP')return '▲ '+Math.abs(t.delta);
 if(t.movement==='DOWN')return '▼ '+Math.abs(t.delta);
 return '—';
}
const rankingBaseRender=renderRanking;
renderRanking=function(){
 rankingBaseRender();if(!communityRankMode||!placeMode)return;
 const visible=placeResults.filter(t=>t.name.includes($('search').value.trim())||t.address.includes($('search').value.trim()));
 Array.from($('ranking').querySelectorAll('button.row')).forEach((b,i)=>{
  const t=visible[i];if(!t)return;
  const label=document.createElement('div');label.className='category';label.textContent=t.rank+'위 '+movementLabel(t)+' · 참여 '+t.participants+'계정 · 메시지 '+t.messageCount+'건';b.append(label);
 });
};
rankButton.onclick=async()=>{
 if(!origin){toast('먼저 내 위치 사용을 눌러주세요.');return;}
 if(!client){toast('서버 연결 후 다시 시도해주세요.');return;}
 const history=rankMode.value==='history';
 if(history&&!sessionUser){toast('순위 이력 조회는 로그인이 필요합니다.');$('loginDialog').showModal();return;}
 const center={...origin},seq=++communityRankSeq;
 rankButton.disabled=true;rankMode.disabled=true;rankStatus.textContent='최근 24시간 활동을 집계하는 중…';
 try{
  const {data,error}=await client.rpc(history?'community_rank_with_history':'community_chat_ranking',history?{center_lat:center.lat,center_lon:center.lon}:{center_lat:center.lat,center_lon:center.lon,radius_km:10});
  if(seq!==communityRankSeq)return;if(error)throw error;
  if(!Array.isArray(data))throw Error();
  if(!data.length){placeMode=true;placeResults=[];setPlaceLabels(true);communityRankMode=true;syncPlaceMarkers();renderRanking();document.querySelector('.ranking h2').textContent='동네 대화 TOP 10';$('ranking').textContent='아직 집계된 활동이 없어요.';rankStatus.textContent=history?'해당 고정 구역의 이번 집계는 0곳입니다. 이 시간의 집계는 저장되며 다음 시간대 첫 조회 때 다시 계산됩니다. 활동이 쌓이면 표시됩니다.':'내 위치 반경 10km 내 최근 24시간 대화 기록이 없습니다. 활동이 쌓이면 표시됩니다.';return;}
  ++placeRequest;if(placeController)placeController.abort();$('placeSearchButton').disabled=false;
  placeResults=data.slice(0,10).map((t,i)=>({id:-(i+1),isLocal:true,name:t.name,address:t.address,lat:Number(t.latitude),lon:Number(t.longitude),category:history?'고정 구역 대화순위':'현재 대화순위',keywords:[],website:null,rank:history?t.current_rank:i+1,history,movement:t.movement,delta:t.rank_change,participants:t.participants,messageCount:t.message_count,reason:'최근 24시간 대화 참여 '+t.participants+'계정 · 메시지 '+t.message_count+'건. '+(history?'저장 시점 기준입니다. ':'조회 시점 기준입니다. ')+'지역 전체 검색량이나 뉴스·블로그 화제성 순위가 아닙니다.'}));
  placeMode=true;setPlaceLabels(true);communityRankMode=true;
  const panel=document.querySelector('.ranking');panel.querySelector('h2').textContent=history?'구역 대화 TOP 10':'현재 대화 TOP 10';panel.querySelector('.live').textContent=history?'HISTORY':'24H';panel.querySelector('.panel-head p').textContent=history?'고정 격자 중심 반경 10km · 참여 계정 수 우선':'내 위치 반경 10km · 참여 계정 수 우선';panel.querySelector('.footnote').textContent=history?'▲▼ 직전 저장 순위와 비교 · NEW 직전 저장분에 없음 · 첫 집계는 비교 불가. 신규 개업이나 서비스 최초 등록이라는 뜻이 아닙니다.':'조회 시점 활동 기준 · 순위 변동 없음';
  syncPlaceMarkers();document.querySelector('.maplabel').textContent='● 대화 인기 장소 '+placeResults.length+'곳';selectTopic(placeResults[0]);
  $('locationLabel').textContent=history?'고정 격자 중심 반경 10km · 저장된 대화순위':'조회 당시 내 위치 반경 10km · 현재 대화순위';
  $('placeSearchStatus').textContent='일반 장소 검색 시 검색 결과 화면으로 전환됩니다.';
  const first=data[0];
  rankStatus.textContent=history?'집계 '+new Date(first.captured_at).toLocaleString('ko-KR')+' · '+(first.previous_captured_at?'비교 '+new Date(first.previous_captured_at).toLocaleString('ko-KR'):'첫 집계 · 비교 이력 없음')+' · 고정 중심 '+Number(first.grid_lat).toFixed(3)+', '+Number(first.grid_lon).toFixed(3)+' · '+data.length+'곳 중 '+placeResults.length+'곳 표시. 다음 시간대의 첫 조회 시 갱신됩니다.':'조회 '+new Date().toLocaleString('ko-KR')+' · '+data.length+'곳 중 '+placeResults.length+'곳 표시. 자동 갱신되지 않습니다.';
 }catch(error){rankStatus.textContent='순위 조회 실패. '+(error.code==='PGRST202'?'Supabase 함수 등록 여부를 확인해주세요.':error.code==='42501'?'로그인과 함수 실행 권한을 확인해주세요.':'잠시 후 다시 시도해주세요. 계속되면 오류 코드: '+String(error.code||'NETWORK'));}
 finally{if(seq===communityRankSeq){rankButton.disabled=false;rankMode.disabled=false;}}
};

// 장소 채팅 신고와 관리자 처리. 권한은 DB 함수에서 다시 검사합니다.
const moderationPanel=document.createElement('section');moderationPanel.className='panel';moderationPanel.style.cssText='margin:0 24px 16px;padding:16px';
const moderationTitle=document.createElement('h2');moderationTitle.textContent='신고 관리';
const moderationButton=document.createElement('button');moderationButton.textContent='관리자 신고함 열기';
const moderationStatus=document.createElement('p');moderationStatus.className='muted';moderationStatus.setAttribute('role','status');
const moderationList=document.createElement('div');
moderationPanel.append(moderationTitle,moderationButton,moderationStatus,moderationList);document.querySelector('.workspace').after(moderationPanel);
moderationPanel.hidden=true;
let moderationAuthSeq=0,moderationAdmin=false,moderationListSeq=0;
function clearModeration(){moderationAdmin=false;moderationPanel.hidden=true;moderationList.replaceChildren();moderationStatus.textContent='';++moderationListSeq;}
async function checkModerationAdmin(){
 const seq=++moderationAuthSeq;clearModeration();if(!client||!sessionUser)return;
 try{const {data,error}=await client.rpc('community_is_admin');if(seq!==moderationAuthSeq||!sessionUser)return;if(error)throw error;moderationAdmin=data===true;moderationPanel.hidden=!moderationAdmin;}catch{}
}
const moderationShowUser=showUser;
showUser=function(){moderationShowUser();checkModerationAdmin();};
// 初期ロードで認証済みだった場合も権限を確認します。
checkModerationAdmin();
const reportDialog=document.createElement('dialog');
const reportTitle=document.createElement('h3');reportTitle.textContent='メッセージを 신고';reportTitle.textContent='메시지 신고';
const reportInfo=document.createElement('p');reportInfo.textContent='신고는 관리자에게 전달됩니다. 개인정보를 추가로 입력하지 마세요.';
const reportReason=document.createElement('select');reportReason.setAttribute('aria-label','신고 사유');
[['spam','스팸·광고'],['abuse','욕설·괴롭힘'],['privacy','개인정보 노출'],['other','기타']].forEach(([value,text])=>{const o=document.createElement('option');o.value=value;o.textContent=text;reportReason.append(o);});
const reportSend=document.createElement('button');reportSend.textContent='신고 접수';reportSend.className='primary';
const reportCancel=document.createElement('button');reportCancel.textContent='취소';reportCancel.onclick=()=>reportDialog.close();
const reportResult=document.createElement('p');reportResult.setAttribute('role','status');
reportDialog.append(reportTitle,reportInfo,reportReason,reportSend,reportCancel,reportResult);document.body.append(reportDialog);
let reportTarget=null;
reportSend.onclick=async()=>{
 if(!client||!sessionUser){reportDialog.close();$('loginDialog').showModal();return;}
 reportSend.disabled=true;
 try{const {error}=await client.rpc('community_report_message',{target_message:reportTarget,report_reason:reportReason.value});if(error)throw error;reportResult.textContent='접수됐습니다. 이미 신고한 메시지는 중복 접수되지 않습니다.';}catch{reportResult.textContent='접수 실패. 로그인 상태와 시간당 20건 제한을 확인해주세요.';}
 finally{reportSend.disabled=false;}
};
const moderationRenderChat=renderChat;
renderChat=function(){
 moderationRenderChat();if(!selected.isLocal)return;
 const rows=Array.from($('chatlog').querySelectorAll('.message'));
 rows.forEach((row,i)=>{const message=communityRows[i];if(!message)return;
  const button=document.createElement('button');button.type='button';button.textContent='신고';button.style.cssText='font-size:12px;margin-top:6px';
  button.onclick=()=>{if(!sessionUser){$('loginDialog').showModal();return;}reportTarget=message.id;reportReason.value='spam';reportResult.textContent='';reportDialog.showModal();};row.append(button);
 });
};
async function fetchModerationReports(){
 if(!client||!sessionUser||!moderationAdmin)return;
 const seq=++moderationListSeq;moderationButton.disabled=true;moderationStatus.textContent='신고를 조회하는 중…';moderationList.replaceChildren();
 try{
  const {data,error}=await client.rpc('community_admin_reports');
  if(seq!==moderationListSeq||!moderationAdmin)return;if(error)throw error;
  if(!Array.isArray(data))throw Error();moderationStatus.textContent=data.length?'미처리 신고 '+data.length+'건 (최대 100건). 삭제는 되돌릴 수 없습니다.':'미처리 신고가 없습니다.';
  const reasons={spam:'스팸·광고',abuse:'욕설·괴롭힘',privacy:'개인정보 노출',other:'기타'};
  data.forEach(item=>{
   const card=document.createElement('div');card.style.cssText='padding:14px 0;border-bottom:1px solid #e2e9e5';
   const title=document.createElement('b');title.textContent=item.place_name+' · '+(reasons[item.reason]||'기타');
   const text=document.createElement('p');text.textContent=item.body;
   const time=document.createElement('p');time.className='muted';time.textContent=new Date(item.reported_at).toLocaleString('ko-KR');
   const remove=document.createElement('button');remove.textContent='메시지 영구 삭제';
   const dismiss=document.createElement('button');dismiss.textContent='신고 기각';
   async function act(name,args){remove.disabled=true;dismiss.disabled=true;try{const {error}=await client.rpc(name,args);if(error)throw error;await fetchModerationReports();await loadRoom();}catch{moderationStatus.textContent='처리 실패. 관리자 권한 또는 이미 처리된 메시지인지 확인해주세요.';remove.disabled=false;dismiss.disabled=false;}}
   remove.onclick=()=>{if(window.confirm('이 메시지를 영구 삭제할까요? 복구할 수 없습니다.'))act('community_admin_delete_message',{target_message:item.message_id});};
   dismiss.onclick=()=>act('community_admin_dismiss_report',{target_report:item.report_id});
   card.append(title,text,time,remove,dismiss);moderationList.append(card);
  });
 }catch{if(seq===moderationListSeq)moderationStatus.textContent='신고함 조회 실패. 관리자 권한과 Supabase 함수를 확인해주세요.';}
 finally{moderationButton.disabled=false;}
}
moderationButton.onclick=fetchModerationReports;
renderChat();

// 신규 장소 저장 중단 안내. 기존 데이터는 삭제하지 않습니다.
const storagePauseNote=document.createElement('p');storagePauseNote.className='muted';storagePauseNote.textContent='이용 조건 검토로 신규 장소 대화방 생성이 일시 중단되었습니다. 기존 방만 이용할 수 있습니다. 외부 검색 결과는 지역 화제 순위의 근거가 아닙니다.';
document.querySelector('.workspace').before(storagePauseNote);

// 사용자 직접 작성 주제방. 외부 장소 데이터와 분리합니다.
(()=>{
 const section=document.createElement('section');section.className='panel';section.style.cssText='margin:16px 24px;padding:20px';
 const heading=document.createElement('h2');heading.textContent='우리 동네 주제방';
 const note=document.createElement('p');note.textContent='직접 작성한 동네 이야기만 올려주세요. 공개 게시판이므로 개인정보를 입력하지 마세요. 주제와 메시지의 신고 버튼으로 부적절한 내용을 알려주세요. 신고만으로 자동 삭제되지는 않습니다.';
 function input(label,max,multi=false){const wrap=document.createElement('label');wrap.style.cssText='display:block;margin:10px 0';wrap.textContent=label;const field=document.createElement(multi?'textarea':'input');field.maxLength=max;field.style.cssText='display:block;width:100%;padding:10px;border:1px solid #ccc;border-radius:8px';wrap.append(field);return {wrap,field};}
 const region=input('동네 이름 (예: 서울특별시 마포구 연남동)',100),title=input('주제 제목',100),body=input('내용',2000,true);
 const listButton=document.createElement('button');listButton.className='btn';listButton.textContent='이 동네 주제 조회';
 const createButton=document.createElement('button');createButton.className='btn';createButton.textContent='주제 만들기 · 로그인 필요';
 const status=document.createElement('p');status.setAttribute('role','status');
 const list=document.createElement('div'),room=document.createElement('div');
 section.append(heading,note,region.wrap,listButton,title.wrap,body.wrap,createButton,status,list,room);document.querySelector('.workspace').after(section);
 let currentId=null,roomSeq=0;

 const topicRankBox=document.createElement('section');
 const topicRankTitle=document.createElement('h3');topicRankTitle.textContent='이 동네 주제 대화 TOP 10';
 const topicRankNote=document.createElement('p');topicRankNote.textContent='직접 작성한 동네 주제 · 최근 24시간 참여 계정 수 → 메시지 수 → 최근 활동순. 로그인 시 시간대별 저장 순위와 ▲▼·NEW, 비로그인은 현재 순위. 시간당 첫 조회 시 저장하며 직전 저장분과 비교합니다. 새 메시지는 다음 시간대 순위부터 반영될 수 있습니다.';
 const topicRankRefresh=document.createElement('button');topicRankRefresh.className='btn';topicRankRefresh.textContent='주제 순위 새로고침';
 const topicRankStatus=document.createElement('p');topicRankStatus.setAttribute('role','status');
 const topicRankList=document.createElement('div');
 topicRankBox.append(topicRankTitle,topicRankNote,topicRankRefresh,topicRankStatus,topicRankList);list.before(topicRankBox);
 let topicRankSeq=0;
 async function loadTopicRanking(){
  const seq=++topicRankSeq,area=region.field.value.trim();topicRankList.replaceChildren();
  if(!client||area.length<2){topicRankStatus.textContent='동네 이름을 입력하고 조회해주세요.';return;}
  topicRankRefresh.disabled=true;topicRankStatus.textContent='집계 중…';
  try{
   let r=await client.rpc('neighborhood_topic_history',{p_region:area});
   if(r.error)r=await client.rpc('neighborhood_topic_ranking',{p_region:area});
   if(seq!==topicRankSeq||region.field.value.trim()!==area)return;
   if(r.error||!Array.isArray(r.data))throw r.error||new Error();
   for(const t of r.data.slice(0,10)){
    const button=document.createElement('button');button.className='btn';button.style.cssText='display:block;text-align:left;width:100%;margin:8px 0';
    button.textContent=t.current_rank+'위 '+(t.movement==='FIRST'?'첫 집계':t.movement==='NEW'?'NEW':t.rank_change>0?'▲ '+t.rank_change:t.rank_change<0?'▼ '+Math.abs(t.rank_change):t.movement?'—':'')+' · '+t.title+' · 참여 '+t.participants+'계정 · 메시지 '+t.message_count+'건';
    button.onclick=()=>openRoom({id:t.topic_id,region_name:t.region_name,title:t.title,body:t.body});topicRankList.append(button);
   }
   topicRankStatus.textContent=r.data.length?area+' · 후보 '+r.data.length+'개 중 '+Math.min(10,r.data.length)+'개 표시 · 조회 '+new Date().toLocaleString('ko-KR'):'최근 24시간 대화 기록이 없습니다. 집계 중입니다.';
  }catch{if(seq===topicRankSeq)topicRankStatus.textContent='순위 조회 실패. 함수 등록과 연결을 확인하고 다시 시도해주세요.';}
  finally{if(seq===topicRankSeq)topicRankRefresh.disabled=false;}
 }
 topicRankRefresh.onclick=loadTopicRanking;
 region.field.addEventListener('input',()=>{++topicRankSeq;topicRankList.replaceChildren();topicRankStatus.textContent='동네가 변경됐습니다. 이 동네 주제 조회를 눌러주세요.';topicRankRefresh.disabled=false;});


 function reportButton(type,id){
  const button=document.createElement('button');button.type='button';button.className='btn';button.style.cssText='display:block;margin:8px 0';button.textContent=type==='topic'?'주제 신고':'메시지 신고';
  button.onclick=()=>{
   if(!client||!sessionUser){toast('로그인 후 신고해주세요.');return;}
   const dialog=document.createElement('dialog');dialog.style.cssText='max-width:420px;width:90%;padding:24px;border:1px solid #ddd;border-radius:12px';
   const h=document.createElement('h3');h.textContent='신고 사유 선택';const select=document.createElement('select');
   for(const [value,label] of [['spam','스팸·광고'],['abuse','욕설·괴롭힘'],['privacy','개인정보 노출'],['other','기타']]){const o=document.createElement('option');o.value=value;o.textContent=label;select.append(o);}
   const send=document.createElement('button');send.textContent='신고 접수';send.className='btn';const cancel=document.createElement('button');cancel.textContent='취소';cancel.className='btn';const result=document.createElement('p');result.setAttribute('role','status');
   cancel.onclick=()=>dialog.close();dialog.addEventListener('close',()=>dialog.remove());
   send.onclick=async()=>{send.disabled=true;try{const r=await client.rpc('neighborhood_report',{p_target_type:type,p_target_id:id,p_reason:select.value});if(r.error)throw r.error;toast('신고가 접수됐습니다.');dialog.close();}catch{result.textContent='접수 실패: 중복 신고·시간당 20건 제한·로그인 상태를 확인해주세요.';}finally{send.disabled=false;}};
   dialog.append(h,select,send,cancel,result);document.body.append(dialog);dialog.showModal();
  };return button;
 }
 const adminButton=document.createElement('button');adminButton.className='btn';adminButton.textContent='주제방 관리자 신고함';
 const adminStatus=document.createElement('p'),adminList=document.createElement('div');adminStatus.setAttribute('role','status');section.append(adminButton,adminStatus,adminList);
 let adminSeq=0;
 async function loadTopicReports(){
  const seq=++adminSeq;adminList.replaceChildren();
  if(!client||!sessionUser){adminStatus.textContent='관리자 계정으로 로그인해주세요.';return;}
  adminButton.disabled=true;adminStatus.textContent='권한 확인 및 신고 조회 중…';
  try{
   const r=await client.rpc('neighborhood_admin_reports');if(seq!==adminSeq)return;if(r.error)throw r.error;
   adminStatus.textContent='미처리 신고 '+(r.data||[]).length+'건 · 최대 100건 표시';
   for(const item of r.data||[]){
    const card=document.createElement('div');card.style.cssText='padding:12px;border-bottom:1px solid #ddd';
    const text=document.createElement('p');text.style.whiteSpace='pre-wrap';text.textContent=(item.target_type==='topic'?'주제':'메시지')+' · '+item.reason+' · '+new Date(item.reported_at).toLocaleString('ko-KR')+'\n'+(item.target_text||'삭제되었거나 없는 항목');
    const dismiss=document.createElement('button');dismiss.className='btn';dismiss.textContent='신고 기각';const remove=document.createElement('button');remove.className='btn';remove.textContent=item.target_type==='topic'?'주제 및 대화 영구 삭제':'메시지 영구 삭제';
    async function resolve(del){
     if(del&&!window.confirm(item.target_type==='topic'?'이 주제와 모든 대화를 영구 삭제합니다. 복구할 수 없습니다. 삭제할까요?':'이 메시지를 영구 삭제합니다. 복구할 수 없습니다. 삭제할까요?'))return;
     dismiss.disabled=remove.disabled=true;
     try{const r=await client.rpc('neighborhood_admin_resolve',{p_report_id:item.report_id,p_delete:del});if(r.error)throw r.error;
      if(del&&item.target_type==='topic'&&currentId===item.target_id){currentId=null;++roomSeq;room.replaceChildren();}
      if(del){await loadTopics();if(currentId)await refreshMessages(currentId);}await loadTopicReports();
     }catch{adminStatus.textContent='처리 실패: 관리자 권한 또는 이미 처리된 신고인지 확인해주세요.';dismiss.disabled=remove.disabled=false;}
    }
    dismiss.onclick=()=>resolve(false);remove.onclick=()=>resolve(true);card.append(text,dismiss,remove);adminList.append(card);
   }
  }catch{adminStatus.textContent='관리자 권한이 없거나 신고함 조회에 실패했습니다.';}finally{adminButton.disabled=false;}
 }
 adminButton.onclick=loadTopicReports;
 // 로그아웃/계정 전환 시 이미 표시된 관리자 내용을 지웁니다.
 let lastAdminUser=null;
 setInterval(()=>{const uid=sessionUser?.id||null;if(uid!==lastAdminUser){lastAdminUser=uid;++adminSeq;adminList.replaceChildren();adminStatus.textContent='';}},1000);

 async function refreshMessages(id){
  const seq=++roomSeq;if(!client)return;
  const r=await client.from('neighborhood_messages').select('id,topic_id,body,created_at').eq('topic_id',id).order('created_at',{ascending:false}).limit(100);
  if(seq!==roomSeq||id!==currentId)return;
  const log=room.querySelector('[data-topic-log]');if(!log)return;
  if(r.error){log.textContent='메시지를 불러오지 못했습니다.';return;}
  log.replaceChildren();for(const m of [...(r.data||[])].reverse()){const p=document.createElement('p');p.style.cssText='white-space:pre-wrap;padding:8px;border-bottom:1px solid #eee';p.textContent='동네 참여자 · '+new Date(m.created_at).toLocaleString('ko-KR')+'\n'+m.body;p.append(reportButton('message',m.id));log.append(p);}
  if(!r.data?.length)log.textContent='첫 대화를 남겨보세요.';
 }
 async function openRoom(t){
  currentId=t.id;room.replaceChildren();const h=document.createElement('h3');h.textContent=t.title;
  const content=document.createElement('p');content.style.whiteSpace='pre-wrap';content.textContent=(t.region_name?'동네: '+t.region_name+'\n':'')+t.body;
  const log=document.createElement('div');log.dataset.topicLog='';log.style.cssText='max-height:320px;overflow:auto';
  const form=document.createElement('form'),message=input('메시지 (최대 500자)',500,true);message.field.required=true;
  const send=document.createElement('button');send.type='submit';send.className='btn';send.textContent='보내기';form.append(message.wrap,send);
  form.onsubmit=async e=>{e.preventDefault();if(!sessionUser){toast('로그인 후 보내주세요.');return;}const value=message.field.value.trim();if(!value)return;send.disabled=true;try{const r=await client.rpc('neighborhood_send_message',{p_topic_id:t.id,p_body:value});if(r.error)throw r.error;message.field.value='';loadTopicRanking();if(currentId===t.id)await refreshMessages(t.id);}catch{toast('전송 실패: 로그인 상태와 3초 전송 간격을 확인해주세요.');}finally{send.disabled=false;}};
  const refresh=document.createElement('button');refresh.className='btn';refresh.textContent='대화 새로고침';refresh.onclick=()=>refreshMessages(t.id);
  room.append(h,content,reportButton('topic',t.id),log,refresh,form);await refreshMessages(t.id);
 }
 const allTopicsButton=document.createElement('button');allTopicsButton.className='btn';allTopicsButton.textContent='전체 동네 글 보기';
 const savedRegionSelect=document.createElement('select');savedRegionSelect.setAttribute('aria-label','기존 글에 저장된 동네 선택');savedRegionSelect.style.cssText='padding:10px;max-width:100%;margin:8px';
 const defaultOption=document.createElement('option');defaultOption.value='';defaultOption.textContent='기존 글의 동네 선택';savedRegionSelect.append(defaultOption);
 listButton.after(allTopicsButton,savedRegionSelect);
 let allTopicsMode=false,savedRegionSeq=0;
 async function refreshSavedRegions(){
  if(!client)return;const seq=++savedRegionSeq;
  const r=await client.from('neighborhood_topics').select('region_name').order('created_at',{ascending:false}).limit(500);
  if(seq!==savedRegionSeq)return;
  if(r.error){savedRegionSelect.title='동네 목록 조회 실패. 전체 동네 글 보기를 눌러주세요.';return;}
  const previous=savedRegionSelect.value;while(savedRegionSelect.options.length>1)savedRegionSelect.remove(1);
  for(const name of [...new Set((r.data||[]).map(t=>t.region_name))].sort()){
   const option=document.createElement('option');option.value=name;option.textContent=name;savedRegionSelect.append(option);
  }
  savedRegionSelect.value=previous;savedRegionSelect.title='최근 작성된 최대 500개 주제에 저장된 동네';
 }
 async function loadTopics(){
  const listGeneration=++topicListGeneration;
  if(!client){status.textContent='서버 연결 중입니다. 잠시 후 다시 조회해주세요.';return;}
  const area=region.field.value.trim(),all=allTopicsMode;
  if(!all&&area.length<2){status.textContent='동네를 입력하거나 전체 동네 글 보기를 눌러주세요.';return;}
  if(!all)loadTopicRanking();else{++topicRankSeq;topicRankList.replaceChildren();topicRankStatus.textContent='전체 글 보기 모드입니다. 동네를 선택하면 해당 동네 TOP 10을 표시합니다.';topicRankRefresh.disabled=false;}
  listButton.disabled=true;allTopicsButton.disabled=true;status.textContent='글을 불러오는 중…';list.replaceChildren();
  try{
   let query=client.from('neighborhood_topics').select('id,region_name,title,body,created_at');
   if(!all)query=query.eq('region_name',area);
   const r=await query.order('created_at',{ascending:false}).limit(50);
   if(listGeneration!==topicListGeneration||all!==allTopicsMode||(!all&&region.field.value.trim()!==area))return;
   if(r.error)throw r.error;
   for(const t of r.data||[]){const button=document.createElement('button');button.className='btn';button.style.cssText='display:block;width:100%;text-align:left;margin:8px 0';button.textContent=t.title+' · '+t.region_name+' · '+new Date(t.created_at).toLocaleDateString('ko-KR');button.onclick=()=>openRoom(t);list.append(button);}
   const count=r.data?.length||0;
   status.textContent=(all?'전체 동네':'선택 동네: '+area)+' · '+count+'개 표시 (최신 50개까지).'+(!count&&!all?' 이 이름으로 저장된 글이 없습니다. 전체 동네 글 보기 또는 기존 글의 동네 선택을 이용하세요.':'');
   refreshSavedRegions();
  }catch{if(listGeneration===topicListGeneration)status.textContent='글 조회 실패. 서버 연결 또는 조회 권한을 확인해주세요. 기존 글이 삭제됐다는 뜻은 아닙니다.';}
  finally{listButton.disabled=false;allTopicsButton.disabled=false;}
 }
 allTopicsButton.onclick=()=>{allTopicsMode=true;topicAreaEdited=true;++topicAreaGeneration;currentId=null;++roomSeq;room.replaceChildren();loadTopics();};
 savedRegionSelect.onchange=()=>{if(!savedRegionSelect.value)return;allTopicsMode=false;region.field.value=savedRegionSelect.value;topicAreaEdited=true;++topicAreaGeneration;currentId=null;++roomSeq;room.replaceChildren();loadTopics();};
 listButton.onclick=()=>{allTopicsMode=false;loadTopics();};

 // 자동 위치 조회가 완료되면 직접 작성 주제 목록과 순위도 함께 조회합니다.
 let topicAreaEdited=false,topicAreaGeneration=0,topicListGeneration=0;
 region.field.addEventListener('input',()=>{allTopicsMode=false;currentId=null;++roomSeq;room.replaceChildren();topicAreaEdited=true;++topicAreaGeneration;++topicListGeneration;});
 const autoAreaNote=document.createElement('p');autoAreaNote.className='muted';autoAreaNote.setAttribute('role','status');
 region.wrap.after(autoAreaNote);
 window.addEventListener('dongneon-region-resolved',async event=>{
  const name=event.detail?.name;if(typeof name!=='string'||name.length<2)return;
  if(topicAreaEdited){autoAreaNote.textContent='감지된 내 동네: '+name+' · 직접 입력한 동네는 유지했습니다.';return;}
  const generation=++topicAreaGeneration;
  allTopicsMode=false;region.field.value=name;
  ++topicRankSeq;topicRankList.replaceChildren();
  currentId=null;++roomSeq;room.replaceChildren();list.replaceChildren();
  autoAreaNote.textContent='내 동네 자동 적용: '+name+' · 주제 목록과 순위 조회 중';
  for(let i=0;i<40&&!client;i++){
   await new Promise(resolve=>setTimeout(resolve,250));
   if(generation!==topicAreaGeneration)return;
  }
  if(generation!==topicAreaGeneration)return;
  if(!client){autoAreaNote.textContent='동네는 적용됐지만 서버 연결이 지연됩니다. 이 동네 주제 조회를 눌러주세요.';return;}
  await loadTopics();
  if(generation===topicAreaGeneration)autoAreaNote.textContent='내 동네 자동 적용: '+name+' · 다른 동네는 직접 입력해 조회할 수 있습니다.';
 });

 createButton.onclick=async()=>{
  if(!client||!sessionUser){toast('로그인 후 주제를 만들어주세요.');return;}
  const area=region.field.value.trim(),name=title.field.value.trim(),text=body.field.value.trim();
  if(area.length<2||name.length<2||!text){status.textContent='동네·제목은 2자 이상, 내용은 1자 이상 입력해주세요.';return;}
  createButton.disabled=true;
  try{const r=await client.rpc('neighborhood_create_topic',{p_region:area,p_title:name,p_body:text});if(r.error)throw r.error;
   allTopicsMode=false;const t={id:r.data,region_name:area,title:name,body:text};title.field.value='';body.field.value='';try{localStorage.removeItem('dongneon-topic-draft-v1');}catch{}await loadTopics();await openRoom(t);
  }catch{status.textContent='생성 실패: 로그인 상태와 시간당 5개 제한을 확인해주세요.';}finally{createButton.disabled=false;}
 };
 setInterval(()=>{if(currentId&&!document.hidden)refreshMessages(currentId);},15000);
 let topicVisible=false;
 if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>{topicVisible=entries[0]?.isIntersecting||false;});observer.observe(section);}
 setInterval(()=>{if(!document.hidden&&topicVisible&&!allTopicsMode&&region.field.value.trim().length>=2&&!topicRankRefresh.disabled)loadTopicRanking();},60000);
 // Local draft storage is opt-in; no account secrets or location stored.
 const draftLabel=document.createElement('label'),draftCheck=document.createElement('input');draftCheck.type='checkbox';draftLabel.append(draftCheck,document.createTextNode(' 이 기기에 주제 초안 저장 (공용 기기에서는 선택하지 마세요)'));
 const draftClear=document.createElement('button');draftClear.className='btn';draftClear.textContent='저장한 초안 삭제';body.wrap.after(draftLabel,draftClear);
 const draftKey='dongneon-topic-draft-v1';
 const saveDraft=()=>{if(!draftCheck.checked)return;try{localStorage.setItem(draftKey,JSON.stringify({title:title.field.value,body:body.field.value}));}catch{}};
 title.field.addEventListener('input',saveDraft);body.field.addEventListener('input',saveDraft);
 draftCheck.onchange=()=>{try{if(!draftCheck.checked)localStorage.removeItem(draftKey);else saveDraft();}catch{}};
 draftClear.onclick=()=>{try{localStorage.removeItem(draftKey);}catch{}title.field.value='';body.field.value='';draftCheck.checked=false;};
 try{const d=JSON.parse(localStorage.getItem(draftKey)||'null');if(d&&typeof d.title==='string'&&typeof d.body==='string'){title.field.value=d.title.slice(0,100);body.field.value=d.body.slice(0,2000);draftCheck.checked=true;}}catch{}

 (async()=>{for(let i=0;i<60&&!client;i++)await new Promise(r=>setTimeout(r,250));if(client)refreshSavedRegions();})();
})();

// 첫 접속 시 현재 위치 적용. 브라우저의 위치 권한은 우회하지 않습니다.
(async function autoLocateOnEntry(){
 const button=document.getElementById('locate');
 if(!button||!navigator.geolocation)return;
 try{
  if(navigator.permissions){
   const permission=await navigator.permissions.query({name:'geolocation'});
   if(permission.state==='denied'){
    const label=document.getElementById('locationLabel');
    if(label)label.textContent='위치 권한이 꺼져 있습니다 · 브라우저에서 허용하거나 지역을 직접 검색해주세요';
    return;
   }
  }
 }catch(e){ /* Permissions API 미지원 시 일반 위치 요청 사용 */ }
 if(!button.disabled)button.click();
})();

// 위치 적용 완료 후 인기순위 자동 조회. 별도 클릭 불필요.
rankButton.textContent='순위 새로고침';
rankStatus.textContent='위치를 확인하면 인기순위를 자동으로 불러옵니다.';
rankMode.value='live';explainRankMode();
let autoRankGeneration=0;
async function autoLoadRank(){
 const generation=++autoRankGeneration;
 if(!origin)return;
 rankStatus.textContent='인기순위 서버 연결을 확인하는 중…';
 for(let i=0;i<40&&!client;i++){
  await new Promise(resolve=>setTimeout(resolve,250));
  if(generation!==autoRankGeneration)return;
 }
 if(generation!==autoRankGeneration)return;
 if(!client){rankStatus.textContent='서버 연결을 확인할 수 없습니다. 순위 새로고침을 눌러주세요.';return;}
 // 로그인하지 않아도 조회 가능한 현재 활동이 기본입니다.
 await rankButton.onclick();
}
const locateThenRank=$('locate').onclick;
$('locate').onclick=async function(event){
 await locateThenRank.call(this,event);
 if(origin)await autoLoadRank();
};
rankMode.onchange=()=>{explainRankMode();if(origin)autoLoadRank();};
// 첫 진입의 위치 요청이 이미 진행 중일 수 있으므로 완료까지 기다립니다.
(async()=>{
 for(let i=0;i<160;i++){
  if(origin&&!$('locate').disabled){await autoLoadRank();return;}
  await new Promise(resolve=>setTimeout(resolve,250));
 }
})();

// 검색 API 최신순 응답의 첫 항목만 기본 표시. 나머지는 반환 순서 유지.
const expandedContentPaint=paintContent;
paintContent=function(container,items,type){
 expandedContentPaint(container,items,type);
 const rows=Array.from(container.children);
 if(rows.length<=1||!items.length)return;
 const more=document.createElement('details');more.style.marginTop='10px';
 const toggle=document.createElement('summary');toggle.style.cssText='cursor:pointer;font-weight:700;padding:10px 0;color:#246c55';
 const count=rows.length-1;
 toggle.textContent='관련 '+(type==='news'?'뉴스':'블로그')+' '+count+'건 더 보기 ▾';
 const rest=document.createElement('div');
 rows.slice(1).forEach(row=>rest.append(row));more.append(toggle,rest);container.append(more);
 more.addEventListener('toggle',()=>{toggle.textContent=more.open?'접기 ▴':'관련 '+(type==='news'?'뉴스':'블로그')+' '+count+'건 더 보기 ▾';});
};
// 이미 표시된 결과도 추가 API 요청 없이 접기 적용.
['sources','blogResults'].forEach(id=>{
 const box=document.getElementById(id);if(!box)return;
 const rows=Array.from(box.children);if(rows.length<=1||box.querySelector('details'))return;
 const more=document.createElement('details'),summary=document.createElement('summary');
 summary.style.cssText='cursor:pointer;font-weight:700;padding:10px 0;color:#246c55';
 const label='나머지 '+(rows.length-1)+'건 더 보기 ▾';summary.textContent=label;
 more.append(summary);rows.slice(1).forEach(row=>more.append(row));box.append(more);
 more.addEventListener('toggle',()=>{summary.textContent=more.open?'접기 ▴':label;});
});

$('reset').hidden=true;

// 이전 index.html이 남아 있어도 초기 시연 문구/버튼을 정리합니다.
(()=>{
 const clean=()=>{
  document.querySelectorAll('.notice').forEach(el=>{if(el.textContent.includes('성수')||el.textContent.includes('MVP'))el.remove();});
  document.querySelectorAll('button').forEach(el=>{if(el.textContent.includes('성수 예시로 돌아가기')){el.hidden=true;el.style.setProperty('display','none','important');}});
  document.querySelectorAll('.eyebrow').forEach(el=>{if(el.textContent.includes('DEMO'))el.textContent='NEIGHBORHOOD COMMUNITY';});
 };
 clean();
 const observer=new MutationObserver(clean);observer.observe(document.body,{childList:true,subtree:true});
})();

// 외부 검색 발견 영역: 내부 대화순위와 구분, API 반환 순서 유지.
(()=>{
 const panel=document.createElement('section');panel.className='panel';panel.style.cssText='margin:16px 24px;padding:20px';
 const title=document.createElement('h2');title.textContent='내 동네 장소 · 최신 뉴스';
 const note=document.createElement('p');note.className='muted';note.textContent='네이버 검색결과입니다. 인기순위나 실제 검색량을 뜻하지 않습니다. 장소는 검색 반환 순서, 뉴스는 최신순이며 동네 밖 결과가 포함될 수 있습니다.';
 const form=document.createElement('form');form.style.cssText='display:flex;gap:8px;flex-wrap:wrap;margin:14px 0';
 const query=document.createElement('input');query.placeholder='동네 이름';query.required=true;query.minLength=2;query.maxLength=65;query.setAttribute('aria-label','검색할 동네');query.style.cssText='flex:1;min-width:160px';
 const category=document.createElement('select');category.setAttribute('aria-label','장소 종류');for(const x of ['카페','맛집','공원','관광명소']){const o=document.createElement('option');o.value=x;o.textContent=x;category.append(o);}
 const refresh=document.createElement('button');refresh.className='primary';refresh.textContent='동네 둘러보기';form.append(query,category,refresh);
 const status=document.createElement('p');status.setAttribute('role','status');
 const grid=document.createElement('div');grid.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr));gap:20px';
 const places=document.createElement('div'),news=document.createElement('div');grid.append(places,news);panel.append(title,note,form,status,grid);document.querySelector('.workspace').after(panel);
 let seq=0,controller=null,edited=false;
 query.addEventListener('input',()=>{edited=true;++seq;if(controller)controller.abort();refresh.disabled=false;});
 async function load(){
  const area=query.value.trim();if(area.length<2)return;
  const generation=++seq;if(controller)controller.abort();controller=new AbortController();const active=controller;
  const timer=setTimeout(()=>active.abort(),15000);refresh.disabled=true;status.textContent='검색 중…';places.replaceChildren();news.replaceChildren();
  try{
   const results=await Promise.allSettled(['local','news'].map(async type=>{
    const params=new URLSearchParams({type,q:type==='local'?area+' '+category.value:area});
    const r=await fetch('/api/search?'+params,{cache:'no-store',signal:active.signal});const d=await r.json();if(!r.ok||!Array.isArray(d.items))throw Error();return d.items;
   }));
   if(generation!==seq)return;
   for(let i=0;i<results.length;i++){
    const box=i===0?places:news;const heading=document.createElement('h3');heading.textContent=i===0?'장소 검색결과 · '+category.value:'동네 최신 뉴스';box.append(heading);
    const result=results[i];if(result.status!=='fulfilled'){const p=document.createElement('p');p.textContent='조회하지 못했습니다. 다시 시도해주세요.';box.append(p);continue;}
    if(!result.value.length){const p=document.createElement('p');p.textContent='검색결과가 없습니다.';box.append(p);continue;}
    result.value.forEach((item,index)=>{
     const card=document.createElement('article');card.style.cssText='padding:14px 0;border-bottom:1px solid #e2e9e5';
     const name=document.createElement('strong');name.textContent=contentText(item.title);card.append(name);
     const meta=document.createElement('p');meta.className='muted';meta.textContent=i===0?(item.roadAddress||item.address||'주소 정보 없음'):(item.pubDate?new Date(item.pubDate).toLocaleString('ko-KR'):'');card.append(meta);
     const url=contentUrl(item.originallink)||contentUrl(item.link);if(url){const link=document.createElement('a');link.className='source';link.href=url;link.target='_blank';link.rel='noopener noreferrer';link.textContent=i===0?'장소 홈페이지 ↗':'기사 원문 ↗';card.append(link);}
     if(i===0){const t=decodePlace(item,index,area+' '+category.value);if(t){const button=document.createElement('button');button.textContent='지도·길찾기 보기';button.onclick=()=>{placeMode=true;placeResults=[t];setPlaceLabels(true);syncPlaceMarkers();selectTopic(t);document.querySelector('.workspace').scrollIntoView({behavior:'smooth',block:'start'});};card.append(button);}}
     box.append(card);
    });
   }
   status.textContent=area+' · 조회 '+new Date().toLocaleString('ko-KR')+' · 대화 인기순위와 별도인 검색 목록입니다.';
  }finally{clearTimeout(timer);if(generation===seq)refresh.disabled=false;}
 }
 form.onsubmit=e=>{e.preventDefault();load();};category.onchange=()=>{if(query.value.trim().length>=2)load();};
 window.addEventListener('dongneon-region-resolved',event=>{if(edited)return;query.value=event.detail.name;load();});
})();

// 관련 뉴스·블로그를 인기순위 옆에 배치. DOM을 이동하므로 기존 갱신/접기 유지.
(()=>{
 const band=document.createElement('div');band.className='rank-content-band';
 const content=document.createElement('section');content.className='panel rank-related-panel';
 const heading=document.createElement('h2');heading.textContent='선택한 장소의 뉴스 · 블로그';
 const hint=document.createElement('p');hint.className='muted';hint.textContent='장소 선택 시 갱신됩니다. 인기순위의 산정 근거는 아닙니다.';
 content.append(heading,hint);
 rankPanel.before(band);band.append(rankPanel,content);
 const style=document.createElement('style');style.textContent=`
 .rank-content-band{display:grid;grid-template-columns:minmax(260px,.8fr) minmax(0,1.2fr);gap:20px;margin:16px 24px;align-items:start}
 .rank-content-band>section.panel{margin:0!important;padding:20px!important;min-width:0;width:auto!important}
 .rank-related-panel>.section{padding:16px 0}.rank-related-panel h2{margin-bottom:8px}
 @media(max-width:800px){.rank-content-band{grid-template-columns:1fr;margin:12px;gap:14px}.rank-content-band>section.panel{padding:18px!important}}
 `;document.head.append(style);
 function moveSources(){
  const news=document.getElementById('sources');
  if(!news)return;
  const newsSection=news.closest('section');
  if(newsSection&&newsSection!==content&&newsSection.parentNode!==content)content.append(newsSection);
  const blogs=document.getElementById('blogResults');
  const blogSection=blogs?.closest('section');
  if(blogSection&&blogSection!==content&&blogSection.parentNode!==content)content.append(blogSection);
 }
 // 블로그 영역을 먼저 생성해 기존 초기화 함수의 위치 의존성을 유지합니다.
 ensureContentAreas();moveSources();
 const originalEnsure=ensureContentAreas;
 ensureContentAreas=function(){originalEnsure();moveSources();};
})();
