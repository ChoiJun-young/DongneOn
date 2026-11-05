let client=null,sessionUser=null,cloudChannel=null,roomSeq=0;
const config=window.DONGNEON_CONFIG||{};
const cloudEnabled=Boolean(config.supabaseUrl&&config.supabasePublicKey);

const topics=[{"id": 1, "name": "서울숲 산책", "category": "여행·산책", "lat": 37.5445, "lon": 127.0374, "change": "▲ 3", "badge": "급상승", "reason": "주말 산책 코스와 단풍 사진을 함께 확인하는 상황을 가정한 예시입니다.", "keywords": ["서울숲", "가을 산책", "사진 명소"]}, {"id": 2, "name": "성수 카페거리", "category": "카페", "lat": 37.5446, "lon": 127.0548, "change": "▲ 5", "badge": "급상승", "reason": "신규 카페와 디저트 후기가 집중되는 상황을 가정했습니다.", "keywords": ["카페 투어", "디저트", "신상 카페"]}, {"id": 3, "name": "뚝섬한강공원", "category": "여행·산책", "lat": 37.5295, "lon": 127.0698, "change": "NEW", "badge": "신규", "reason": "한강 피크닉과 저녁 산책 정보에 관심이 모이는 예시입니다.", "keywords": ["피크닉", "한강", "노을"]}, {"id": 4, "name": "성수 팝업스토어", "category": "문화", "lat": 37.5443, "lon": 127.056, "change": "▲ 2", "badge": "급상승", "reason": "짧은 운영 기간의 팝업 행사에 방문 관심이 몰리는 예시입니다. 실제 진행 여부는 원문 확인이 필요합니다.", "keywords": ["팝업", "대기", "예약"]}, {"id": 5, "name": "성수동 맛집", "category": "맛집", "lat": 37.5419, "lon": 127.0564, "change": "▼ 1", "badge": "", "reason": "주변 식당 후기와 점심 추천을 함께 살펴보는 예시입니다. 특정 식당을 추천하거나 검증한 결과가 아닙니다.", "keywords": ["점심", "웨이팅", "맛집"]}, {"id": 6, "name": "서울숲 문화공간", "category": "문화", "lat": 37.5456, "lon": 127.0405, "change": "▲ 1", "badge": "", "reason": "전시와 문화공간 방문 정보를 탐색하는 예시입니다.", "keywords": ["전시", "문화생활", "주말"]}, {"id": 7, "name": "성수 베이커리", "category": "카페", "lat": 37.5461, "lon": 127.0515, "change": "▼ 3", "badge": "", "reason": "베이커리 방문 후기와 빵 추천에 관심이 생기는 예시입니다.", "keywords": ["빵지순례", "베이커리", "커피"]}, {"id": 8, "name": "성수역 주변 점심", "category": "맛집", "lat": 37.5446, "lon": 127.0559, "change": "NEW", "badge": "신규", "reason": "직장인 점심 메뉴를 찾는 상황을 가정한 예시입니다.", "keywords": ["직장인", "점심 메뉴", "혼밥"]}, {"id": 9, "name": "응봉산 전망", "category": "여행·산책", "lat": 37.5489, "lon": 127.0298, "change": "▼ 2", "badge": "", "reason": "가벼운 산책과 전망 사진을 찾는 예시입니다.", "keywords": ["전망", "야경", "산책"]}, {"id": 10, "name": "성수 주말 나들이", "category": "문화", "lat": 37.5432, "lon": 127.0487, "change": "−", "badge": "", "reason": "하루 동안 둘러볼 동네 코스를 찾는 예시입니다.", "keywords": ["데이트", "주말 코스", "나들이"]}, {"id": 11, "name": "지역 관심 키워드 예시 11", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 12, "name": "지역 관심 키워드 예시 12", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 13, "name": "지역 관심 키워드 예시 13", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 14, "name": "지역 관심 키워드 예시 14", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 15, "name": "지역 관심 키워드 예시 15", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 16, "name": "지역 관심 키워드 예시 16", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 17, "name": "지역 관심 키워드 예시 17", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 18, "name": "지역 관심 키워드 예시 18", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 19, "name": "지역 관심 키워드 예시 19", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 20, "name": "지역 관심 키워드 예시 20", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 21, "name": "지역 관심 키워드 예시 21", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 22, "name": "지역 관심 키워드 예시 22", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 23, "name": "지역 관심 키워드 예시 23", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 24, "name": "지역 관심 키워드 예시 24", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 25, "name": "지역 관심 키워드 예시 25", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 26, "name": "지역 관심 키워드 예시 26", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 27, "name": "지역 관심 키워드 예시 27", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 28, "name": "지역 관심 키워드 예시 28", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 29, "name": "지역 관심 키워드 예시 29", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 30, "name": "지역 관심 키워드 예시 30", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 31, "name": "지역 관심 키워드 예시 31", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 32, "name": "지역 관심 키워드 예시 32", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 33, "name": "지역 관심 키워드 예시 33", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 34, "name": "지역 관심 키워드 예시 34", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 35, "name": "지역 관심 키워드 예시 35", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 36, "name": "지역 관심 키워드 예시 36", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 37, "name": "지역 관심 키워드 예시 37", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 38, "name": "지역 관심 키워드 예시 38", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 39, "name": "지역 관심 키워드 예시 39", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 40, "name": "지역 관심 키워드 예시 40", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 41, "name": "지역 관심 키워드 예시 41", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 42, "name": "지역 관심 키워드 예시 42", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 43, "name": "지역 관심 키워드 예시 43", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 44, "name": "지역 관심 키워드 예시 44", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 45, "name": "지역 관심 키워드 예시 45", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 46, "name": "지역 관심 키워드 예시 46", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 47, "name": "지역 관심 키워드 예시 47", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 48, "name": "지역 관심 키워드 예시 48", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 49, "name": "지역 관심 키워드 예시 49", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 50, "name": "지역 관심 키워드 예시 50", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 51, "name": "지역 관심 키워드 예시 51", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 52, "name": "지역 관심 키워드 예시 52", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 53, "name": "지역 관심 키워드 예시 53", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 54, "name": "지역 관심 키워드 예시 54", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 55, "name": "지역 관심 키워드 예시 55", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 56, "name": "지역 관심 키워드 예시 56", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 57, "name": "지역 관심 키워드 예시 57", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 58, "name": "지역 관심 키워드 예시 58", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 59, "name": "지역 관심 키워드 예시 59", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 60, "name": "지역 관심 키워드 예시 60", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 61, "name": "지역 관심 키워드 예시 61", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 62, "name": "지역 관심 키워드 예시 62", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 63, "name": "지역 관심 키워드 예시 63", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 64, "name": "지역 관심 키워드 예시 64", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 65, "name": "지역 관심 키워드 예시 65", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 66, "name": "지역 관심 키워드 예시 66", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 67, "name": "지역 관심 키워드 예시 67", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 68, "name": "지역 관심 키워드 예시 68", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 69, "name": "지역 관심 키워드 예시 69", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 70, "name": "지역 관심 키워드 예시 70", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 71, "name": "지역 관심 키워드 예시 71", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 72, "name": "지역 관심 키워드 예시 72", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 73, "name": "지역 관심 키워드 예시 73", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 74, "name": "지역 관심 키워드 예시 74", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 75, "name": "지역 관심 키워드 예시 75", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 76, "name": "지역 관심 키워드 예시 76", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 77, "name": "지역 관심 키워드 예시 77", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 78, "name": "지역 관심 키워드 예시 78", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 79, "name": "지역 관심 키워드 예시 79", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 80, "name": "지역 관심 키워드 예시 80", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 81, "name": "지역 관심 키워드 예시 81", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 82, "name": "지역 관심 키워드 예시 82", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 83, "name": "지역 관심 키워드 예시 83", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 84, "name": "지역 관심 키워드 예시 84", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 85, "name": "지역 관심 키워드 예시 85", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 86, "name": "지역 관심 키워드 예시 86", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 87, "name": "지역 관심 키워드 예시 87", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 88, "name": "지역 관심 키워드 예시 88", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 89, "name": "지역 관심 키워드 예시 89", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 90, "name": "지역 관심 키워드 예시 90", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 91, "name": "지역 관심 키워드 예시 91", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 92, "name": "지역 관심 키워드 예시 92", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 93, "name": "지역 관심 키워드 예시 93", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 94, "name": "지역 관심 키워드 예시 94", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 95, "name": "지역 관심 키워드 예시 95", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 96, "name": "지역 관심 키워드 예시 96", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 97, "name": "지역 관심 키워드 예시 97", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 98, "name": "지역 관심 키워드 예시 98", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 99, "name": "지역 관심 키워드 예시 99", "category": "샘플", "lat": 37.5445, "lon": 127.0374}, {"id": 100, "name": "지역 관심 키워드 예시 100", "category": "샘플", "lat": 37.5445, "lon": 127.0374}];const $=id=>document.getElementById(id);let selected=topics[0],origin=null,map,routeLine,userMarker,requestId=0;let routeController=null;const markers=[];const storage={get(k,f){try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch{return false}}};let user=storage.get('dongneon-user','');let messages=storage.get('dongneon-messages',[]);if(!Array.isArray(messages))messages=[];let channel;try{channel=new BroadcastChannel('dongneon-chat');channel.onmessage=e=>{if(!cloudEnabled&&e.data==='refresh'){messages=storage.get('dongneon-messages',[]);renderChat()}}}catch{}
function toast(text){$('toast').textContent=text;$('toast').classList.remove('hidden');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').classList.add('hidden'),4500)}
function initMap(){if(!window.L){fallbackMap(selected);return}$('map').replaceChildren();map=L.map('map').setView([37.540,127.049],14);let tileLoads=0,tileErrors=0;const tiles=L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',maxZoom:19}).addTo(map);tiles.on('tileload',()=>tileLoads++);tiles.on('tileerror',()=>{if(++tileErrors>=4&&tileLoads===0&&map){map.remove();map=null;routeLine=null;userMarker=null;markers.length=0;fallbackMap(selected);toast('지도 타일을 불러오지 못해 대체 지도로 전환했습니다.')}});topics.slice(0,10).forEach(t=>{let m=L.marker([t.lat,t.lon],{icon:L.divIcon({className:'',html:'<div class="mapnumber">'+t.id+'</div>',iconSize:[29,29]})}).addTo(map).bindTooltip(t.name);m.on('click',()=>selectTopic(t));markers.push(m)});}
function renderRanking(){const q=$('search').value.trim();$('ranking').replaceChildren();topics.slice(0,10).filter(t=>t.name.includes(q)).forEach(t=>{const b=document.createElement('button');b.className='row'+(t.id===selected.id?' selected':'');b.setAttribute('aria-pressed',t.id===selected.id);b.innerHTML='<span class="rank">'+t.id+'</span><span class="topic">'+t.name+(t.badge?'<span class="pill">'+t.badge+'</span>':'')+'<div class="category">'+t.category+'</div></span><span class="change '+(t.change.includes('▼')?'down':t.change==='NEW'?'new':'')+'">'+t.change+'</span>';b.onclick=()=>selectTopic(t);$('ranking').append(b)});if(!$('ranking').children.length){const p=document.createElement('p');p.className='footnote';p.textContent='상위 10개에 일치하는 키워드가 없어요.';$('ranking').append(p)}}
function selectTopic(t){selected=t;renderRanking();$('detailName').textContent=t.name;$('detailCategory').textContent=t.category+' / 예시 '+t.id+'위';$('reason').textContent=t.reason;$('keywords').replaceChildren();t.keywords.forEach(k=>{const s=document.createElement('span');s.className='chip';s.textContent='#'+k;$('keywords').append(s)});$('routeTitle').textContent=t.name+' 가는 길';const q=encodeURIComponent(t.name);$('kakao').href='https://map.kakao.com/link/to/'+q+','+t.lat+','+t.lon;$('naver').href='https://map.naver.com/p/search/'+q;const sources=[['네이버 뉴스에서 검색','https://search.naver.com/search.naver?where=news&query='+q],['네이버 블로그에서 검색','https://search.naver.com/search.naver?where=blog&query='+q],['YouTube에서 검색','https://www.youtube.com/results?search_query='+q]];$('sources').replaceChildren();sources.forEach(([label,url])=>{const a=document.createElement('a');a.className='source';a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=label+' ↗';$('sources').append(a)});if(map){map.panTo([t.lat,t.lon]);markers[t.id-1].openTooltip()}else{fallbackMap(t)}renderChat();if(cloudEnabled&&client)loadRoom();updateRoute()}
function kmBetween(a,b){const rad=x=>x*Math.PI/180,dlat=rad(b.lat-a.lat),dlon=rad(b.lon-a.lon),v=Math.sin(dlat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dlon/2)**2;return 6371*2*Math.atan2(Math.sqrt(v),Math.sqrt(1-v))}
async function updateRoute(){const seq=++requestId;if(routeController)routeController.abort();if(routeLine&&map){map.removeLayer(routeLine);routeLine=null}$('distance').textContent=$('drive').textContent=$('walk').textContent='—';$('distanceLabel').textContent='자동차 거리';if(!origin){$('routeStatus').textContent='내 위치를 허용하면 자동차 경로를 조회합니다.';$('routeBadge').textContent='출발지 미설정';return}const t=selected,d=kmBetween(origin,t);$('walk').textContent=Math.max(1,Math.round(d/4*60))+'분';$('routeStatus').textContent='자동차 경로를 조회하고 있어요…';$('routeBadge').textContent='경로 조회 중';if(map)map.fitBounds([[origin.lat,origin.lon],[t.lat,t.lon]],{padding:[45,45],maxZoom:16});if(d>300){$('routeStatus').textContent='출발지가 예시 장소와 너무 멀어요. 지역 데이터가 성수 예시로 고정되어 있습니다.';$('routeBadge').textContent='다른 지역';return}routeController=new AbortController();const timeout=setTimeout(()=>routeController.abort(),12000);try{const res=await fetch('https://router.project-osrm.org/route/v1/driving/'+origin.lon+','+origin.lat+';'+t.lon+','+t.lat+'?overview=full&geometries=geojson',{signal:routeController.signal});if(!res.ok)throw Error();const body=await res.json();if(seq!==requestId)return;const r=body.routes?.[0];if(!r)throw Error();$('distance').textContent=(r.distance/1000).toFixed(1)+'km';$('drive').textContent=Math.max(1,Math.round(r.duration/60))+'분';$('routeBadge').textContent='자동차 경로';$('routeStatus').textContent='내 위치 → '+t.name+' · 실시간 교통을 반영하지 않은 추정치';if(map){routeLine=L.geoJSON(r.geometry,{style:{color:'#087b60',weight:5,opacity:.85}}).addTo(map);map.fitBounds(routeLine.getBounds(),{padding:[40,40]})}}catch{if(seq!==requestId)return;$('routeBadge').textContent='경로 조회 실패';$('routeStatus').textContent='자동차 경로를 불러오지 못했어요. 지도 앱에서 길찾기를 이용해 주세요. 선형 경로를 임의로 표시하지 않습니다.'}finally{clearTimeout(timeout)}}
$('locate').onclick=()=>{if(!navigator.geolocation){toast('이 브라우저는 위치 기능을 지원하지 않습니다.');return}$('locate').disabled=true;$('locate').textContent='위치 확인 중…';navigator.geolocation.getCurrentPosition(p=>{origin={lat:p.coords.latitude,lon:p.coords.longitude};$('locationLabel').textContent='내 위치 적용 · 순위와 장소는 성수 예시로 고정되어 있어요';if(map){if(userMarker)map.removeLayer(userMarker);userMarker=L.circleMarker([origin.lat,origin.lon],{radius:8,color:'#fff',weight:3,fillColor:'#3478c4',fillOpacity:1}).addTo(map).bindTooltip('내 위치')}restoreLocate();updateRoute()},e=>{restoreLocate();toast(e.code===1?'위치 권한이 거부됐습니다. 브라우저 권한 설정 또는 HTTPS 실행을 확인해 주세요.':'위치를 확인할 수 없어요. 잠시 후 다시 시도해 주세요.')},{enableHighAccuracy:false,timeout:12000,maximumAge:60000})};function restoreLocate(){$('locate').disabled=false;$('locate').textContent='◎ 내 위치 사용'}
$('reset').onclick=()=>{origin=null;if(userMarker&&map){map.removeLayer(userMarker);userMarker=null}$('locationLabel').textContent='서울 성수 · 예시 탐색 중심 / 내 위치는 아직 사용하지 않아요';selectTopic(topics[0]);if(map)map.setView([37.540,127.049],14)};
function renderChat(){
 $('chatlog').replaceChildren();const list=messages.filter(m=>m.topic===selected.id).slice(-60);
 if(!list.length){const p=document.createElement('p');p.className='muted';p.textContent=cloudEnabled?'아직 대화가 없어요. 이메일 인증 후 첫 이야기를 남겨보세요.':'아직 대화가 없어요. 닉네임 체험으로 이야기를 남겨보세요.';$('chatlog').append(p)}
 list.forEach(m=>{const row=document.createElement('div');row.className='message';const name=document.createElement('b');name.textContent=m.user+' · '+new Date(m.time).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'});const text=document.createElement('span');text.textContent=m.text;row.append(name,text);$('chatlog').append(row)});$('chatlog').scrollTop=$('chatlog').scrollHeight;
}
function showUser(){$('login').textContent=cloudEnabled?(sessionUser?'로그아웃':'이메일로 로그인'):(user?user+' · 로그아웃':'체험 ID 만들기')}
$('login').onclick=async()=>{if(cloudEnabled){if(!client){toast('서버 연결이 완료되지 않았습니다. 설정과 네트워크를 확인해 주세요.');return}if(sessionUser){const {error}=await client.auth.signOut();if(error){toast('로그아웃 실패: 다시 시도해 주세요.');return}sessionUser=null;showUser();return}$('loginDialog').showModal()}else if(user){user='';storage.set('dongneon-user','');showUser()}else $('loginDialog').showModal()};
$('cancelLogin').onclick=()=>$('loginDialog').close();
$('sendOtp').onclick=async()=>{const email=$('email').value.trim(),nickname=$('nickname').value.trim();if(!email||!$('email').checkValidity()||nickname.length<2){toast('닉네임과 올바른 이메일을 입력해 주세요.');return}if(!client)return;$('sendOtp').disabled=true;try{const {error}=await client.auth.signInWithOtp({email,options:{data:{nickname}}});if(error)throw error;toast('인증코드를 발송했습니다. 이메일함과 스팸함을 확인해 주세요.')}catch{toast('코드 발송 실패: 이메일 설정·발송 한도를 확인해 주세요.')}finally{$('sendOtp').disabled=false}};
$('loginForm').onsubmit=async e=>{e.preventDefault();const val=$('nickname').value.trim();if(val.length<2){toast('닉네임은 2자 이상 입력해 주세요.');return}if(!cloudEnabled){user=val;storage.set('dongneon-user',user);showUser();$('loginDialog').close();return}if(!client){toast('서버 연결 실패: config.js를 확인해 주세요.');return}const email=$('email').value.trim(),token=$('otp').value.trim();if(!email||!token){toast('이메일 인증코드를 받아 입력해 주세요.');return}$('authSubmit').disabled=true;try{const {data,error}=await client.auth.verifyOtp({email,token,type:'email'});if(error)throw error;sessionUser=data.user;const result=await client.auth.updateUser({data:{nickname:val}});if(result.error)toast('로그인 완료. 닉네임 변경은 반영되지 않았습니다.');$('loginDialog').close();$('otp').value='';showUser();await loadRoom()}catch{toast('인증 실패: 이메일과 코드·만료 여부를 확인해 주세요.')}finally{$('authSubmit').disabled=false}};
$('chatForm').onsubmit=async e=>{e.preventDefault();const text=$('chatText').value.trim();if(!text)return;if(cloudEnabled){if(!client){toast('서버 미연결로 메시지를 전송할 수 없습니다.');return}if(!sessionUser){$('loginDialog').showModal();return}const button=$('chatForm').querySelector('button');button.disabled=true;try{const {error}=await client.from('messages').insert({topic_id:selected.id,body:text.slice(0,300)});if(error)throw error;$('chatText').value='';await loadRoom()}catch{toast('전송 실패: 연결 상태 또는 3초 전송 간격을 확인해 주세요.')}finally{button.disabled=false}return}if(!user){$('loginDialog').showModal();return}messages=storage.get('dongneon-messages',messages);messages.push({topic:selected.id,user,text:text.slice(0,300),time:Date.now()});messages=messages.slice(-500);if(!storage.set('dongneon-messages',messages))toast('메시지를 브라우저에 저장하지 못했습니다.');$('chatText').value='';renderChat();channel?.postMessage('refresh')};
window.addEventListener('storage',e=>{if(!cloudEnabled&&e.key==='dongneon-messages'){messages=storage.get('dongneon-messages',[]);renderChat()}});
function tab(name){document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));$('trend').classList.toggle('hidden',name!=='trend');$('empty').classList.toggle('hidden',name==='trend');$('emptyTitle').textContent=({news:'동네소식',info:'정보',market:'중고거래'})[name]+' · 준비 중';if(name==='trend'&&map)setTimeout(()=>map.invalidateSize(),50)}document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>tab(b.dataset.tab));$('back').onclick=()=>tab('trend');$('search').oninput=renderRanking;$('about').onclick=()=>$('aboutDialog').showModal();$('closeAbout').onclick=()=>$('aboutDialog').close();

function fallbackMap(t){const box=$('map');box.replaceChildren();const frame=document.createElement('iframe');frame.className='map-fallback';frame.title=t.name+' OpenStreetMap 대체 지도';frame.referrerPolicy='no-referrer';const bbox=[t.lon-.018,t.lat-.012,t.lon+.018,t.lat+.012].join(',');frame.src='https://www.openstreetmap.org/export/embed.html?bbox='+encodeURIComponent(bbox)+'&layer=mapnik&marker='+t.lat+'%2C'+t.lon;box.append(frame);const label=document.querySelector('.maplabel');label.textContent='대체 지도 · 선택한 장소 표시 / 경로 선은 지원하지 않아요';$('routeStatus').textContent='대화형 지도 로딩 실패로 대체 지도를 표시합니다. 아래 지도 앱 링크도 사용할 수 있어요.'}
function loadScript(url){return new Promise((resolve,reject)=>{const el=document.createElement('script');let done=false;const timer=setTimeout(()=>{done=true;el.remove();reject(new Error('timeout'))},7000);el.src=url;el.onload=()=>{clearTimeout(timer);if(!done)resolve()};el.onerror=()=>{clearTimeout(timer);if(!done)reject(new Error('load failed'))};document.head.append(el)})}
async function loadLibrary(paths,ready){if(ready())return true;for(const url of paths){try{await loadScript(url);if(ready())return true}catch{}}return false}
async function loadRoom(){if(!client)return;const id=selected.id,seq=++roomSeq;try{const {data,error}=await client.from('messages').select('id,topic_id,nickname,body,created_at').eq('topic_id',id).order('created_at',{ascending:false}).limit(60);if(seq!==roomSeq||id!==selected.id)return;if(error)throw error;messages=data.reverse().map(m=>({topic:m.topic_id,user:m.nickname,text:m.body,time:m.created_at}));renderChat()}catch{if(seq!==roomSeq)return;messages=[];renderChat();$('chatlog').textContent='채팅을 불러오지 못했습니다. 데이터베이스 설정을 확인해 주세요.'}}
async function bootCloud(){if(!cloudEnabled){$('chatMode').textContent='로컬 체험';showUser();return}$('chatMode').textContent='서버 연결 중';$('cloudAuth').classList.remove('hidden');$('email').required=true;$('otp').required=true;$('authSubmit').textContent='인증코드로 로그인';$('authHelp').textContent='닉네임·이메일을 입력해 인증코드를 받으세요. 이메일 계정 인증으로 여러 사용자가 같은 대화방에 참여합니다.';messages=[];renderChat();showUser();const loaded=await loadLibrary(['https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js','https://unpkg.com/@supabase/supabase-js@2/dist/umd/supabase.js'],()=>!!window.supabase);if(!loaded){$('chatMode').textContent='서버 로딩 실패';toast('인증 라이브러리를 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.');return}try{client=window.supabase.createClient(config.supabaseUrl,config.supabasePublicKey);const {data,error}=await client.auth.getSession();if(error)throw error;sessionUser=data.session?.user??null;showUser();client.auth.onAuthStateChange((_event,session)=>{sessionUser=session?.user??null;showUser()});cloudChannel=client.channel('dongneon-messages').on('postgres_changes',{event:'INSERT',schema:'public',table:'messages'},payload=>{if(payload.new.topic_id===selected.id)loadRoom()}).subscribe(status=>{$('chatMode').textContent=status==='SUBSCRIBED'?'공유 채팅':status==='CHANNEL_ERROR'||status==='TIMED_OUT'?'재연결 중':'연결 중'});await loadRoom();setInterval(()=>{if(!document.hidden)loadRoom()},15000)}catch{$('chatMode').textContent='설정 확인 필요';toast('Supabase 연결 실패: 주소와 공개 키를 확인해 주세요.')}}
async function bootMap(){const style=document.createElement('link');style.rel='stylesheet';style.href='https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css';style.onerror=()=>{style.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';style.onerror=null};document.head.append(style);const loaded=await loadLibrary(['https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js','https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'],()=>!!window.L);if(loaded){try{initMap();selectTopic(selected);return}catch{}}fallbackMap(selected)}
showUser();selectTopic(selected);bootMap();bootCloud();

// 실제 뉴스 조회 기능 추가
(() => {
  const originalSelectTopic = selectTopic;
  let newsRequestNumber = 0;

  function cleanNewsText(value) {
    const parsed = new DOMParser().parseFromString(
      String(value || ""),
      "text/html"
    );
    return parsed.body.textContent || "";
  }

  function safeNewsUrl(value) {
    try {
      const url = new URL(value);
      return ["https:", "http:"].includes(url.protocol)
        ? url.href
        : null;
    } catch {
      return null;
    }
  }

  async function loadTopicNews(topic) {
    const requestNumber = ++newsRequestNumber;
    const container = document.getElementById("sources");

    if (!container) return;

    const section = container.closest("section");
    const heading = section?.querySelector("h3");
    const description = section?.querySelector("p");

    if (heading) heading.textContent = "관련 뉴스";

    if (description) {
      description.textContent =
        "키워드 검색 결과입니다. 지역과 직접 관련 없는 기사가 포함될 수 있으며, 화제 순위의 근거 자료는 아닙니다.";
    }

    container.replaceChildren();

    const status = document.createElement("p");
    status.className = "muted";
    status.textContent = "뉴스를 불러오는 중…";
    container.append(status);

    try {
      const params = new URLSearchParams({
        type: "news",
        q: topic.name
      });

      const response = await fetch("/api/search?" + params);
      const data = await response.json();

      // 다른 키워드를 선택했다면 이전 요청 결과는 무시
      if (
        requestNumber !== newsRequestNumber ||
        selected.id !== topic.id
      ) {
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || "뉴스 조회 실패");
      }

      if (!Array.isArray(data.items)) {
        throw new Error("검색 결과 형식을 확인할 수 없습니다.");
      }

      container.replaceChildren();

      if (data.items.length === 0) {
        status.textContent = "관련 뉴스 검색 결과가 없습니다.";
        container.append(status);
        return;
      }

      data.items.forEach(item => {
        const url =
          safeNewsUrl(item.originallink) ||
          safeNewsUrl(item.link);

        if (!url) return;

        const article = document.createElement("div");
        article.style.padding = "10px 0";
        article.style.borderBottom = "1px solid #e2e9e5";

        const link = document.createElement("a");
        link.className = "source";
        link.href = url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = cleanNewsText(item.title) + " ↗";
        link.style.fontWeight = "700";

        const date = document.createElement("p");
        date.className = "muted";

        const publishedAt = new Date(item.pubDate);

        date.textContent = Number.isNaN(publishedAt.getTime())
          ? "발행일 정보 없음"
          : publishedAt.toLocaleString("ko-KR");

        const summary = document.createElement("p");
        summary.className = "muted";
        summary.textContent = cleanNewsText(item.description);

        article.append(link, date, summary);
        container.append(article);
      });

      if (!container.children.length) {
        status.textContent =
          "열 수 있는 기사 링크가 없습니다.";
        container.append(status);
      }
    } catch {
      if (
        requestNumber !== newsRequestNumber ||
        selected.id !== topic.id
      ) {
        return;
      }

      container.replaceChildren();
      status.textContent =
        "뉴스를 불러오지 못했습니다. 잠시 후 키워드를 다시 선택해주세요.";
      container.append(status);
    }
  }

  // 기존 지도·길찾기·채팅 동작은 유지
  selectTopic = function(topic) {
    originalSelectTopic(topic);
    loadTopicNews(topic);
  };

  // 현재 선택된 키워드도 바로 조회
  loadTopicNews(selected);
})();
