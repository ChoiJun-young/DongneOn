module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({error: 'GET 요청만 가능합니다.'});
  }
  const rawLat = req.query.lat;
  const rawLon = req.query.lon;
  const lat = Number(rawLat), lon = Number(rawLon);
  if (typeof rawLat !== 'string' || typeof rawLon !== 'string' || !rawLat.trim() || !rawLon.trim() || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat)>90 || Math.abs(lon)>180) {
    return res.status(400).json({error:'올바른 위도·경도가 필요합니다.'});
  }
  const key = process.env.KAKAO_REST_API_KEY;
  if (!key) return res.status(503).json({error:'카카오 환경변수가 설정되지 않았습니다.'});
  const url = new URL('https://dapi.kakao.com/v2/local/geo/coord2regioncode.json');
  url.searchParams.set('x',String(lon));
  url.searchParams.set('y',String(lat));
  const controller = new AbortController();
  const timer = setTimeout(()=>controller.abort(),8000);
  try {
    const upstream = await fetch(url,{headers:{Authorization:'KakaoAK '+key},signal:controller.signal});
    if (!upstream.ok) return res.status(502).json({error:'카카오 지역 조회가 실패했습니다.',upstreamStatus:upstream.status});
    const data = await upstream.json();
    const documents = Array.isArray(data.documents)?data.documents:[];
    const region = documents.find(d=>d.region_type==='H') || documents.find(d=>d.region_type==='B');
    if (!region) return res.status(404).json({error:'해당 좌표의 국내 동네 정보를 찾지 못했습니다.'});
    return res.status(200).json({name:region.address_name,code:region.code,regionType:region.region_type,province:region.region_1depth_name,city:region.region_2depth_name,district:region.region_3depth_name});
  } catch (error) {
    return res.status(502).json({error:error.name==='AbortError'?'지역 조회 시간이 초과됐습니다.':'지역 조회 서버에 연결하지 못했습니다.'});
  } finally {clearTimeout(timer);}
};
