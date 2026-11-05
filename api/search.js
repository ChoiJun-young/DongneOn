module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({
      error: "GET 요청만 가능합니다."
    });
  }

  const query = String(req.query.q || "").trim();
  const type = String(req.query.type || "news");

  if (!query || query.length > 80) {
    return res.status(400).json({
      error: "검색어를 1~80자로 입력해주세요."
    });
  }

  if (!["news", "blog", "local"].includes(type)) {
    return res.status(400).json({
      error: "지원하지 않는 검색 종류입니다."
    });
  }

  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(503).json({
      error: "Vercel의 네이버 환경변수를 확인해주세요."
    });
  }

  const url = new URL(
    `https://naverapihub.apigw.ntruss.com/search/v1/${type}`
  );

  url.searchParams.set("query", query);
  url.searchParams.set("display", "5");
  url.searchParams.set("format", "json");

  if (type !== "local") {
    url.searchParams.set("sort", "date");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(url, {
      headers: {
        "X-NCP-APIGW-API-KEY-ID": clientId,
        "X-NCP-APIGW-API-KEY": clientSecret
      },
      signal: controller.signal
    });

    if (!response.ok) {
      return res.status(502).json({
        error: "네이버 API 요청이 실패했습니다.",
        upstreamStatus: response.status
      });
    }

    const data = await response.json();

    res.setHeader(
      "Cache-Control",
      "public, s-maxage=300, stale-while-revalidate=60"
    );

    return res.status(200).json(data);
  } catch (error) {
    return res.status(502).json({
      error: error.name === "AbortError"
        ? "응답 시간이 초과됐습니다. 잠시 후 다시 시도해주세요."
        : "검색 서버 연결에 실패했습니다."
    });
  } finally {
    clearTimeout(timer);
  }
};
