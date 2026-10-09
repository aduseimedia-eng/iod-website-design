export function GET() {
  return Response.json({ status: "ok", service: "iod-gh-web" }, { headers: { "Cache-Control": "no-store" } });
}
